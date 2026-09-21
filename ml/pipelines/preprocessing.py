"""
AAHAR ML — Spectral Preprocessing Pipeline
Section 9.2 Step 2: SNV, Savitzky-Golay (11, 2), PDS Calibration Transfer, Mahalanobis OOD.
"""

from typing import Dict, Optional, Tuple
import numpy as np
from scipy.linalg import solve
from scipy.signal import savgol_filter


# ---------------------------------------------------------------------------
# 1. Standard Normal Variate (SNV)
# ---------------------------------------------------------------------------

def snv(spectra: np.ndarray) -> np.ndarray:
    """
    Standard Normal Variate correction.
    Removes multiplicative scatter and additive baseline effects.
    Each spectrum row becomes mean=0, std=1.

    Args:
        spectra: (N, B) array of raw intensities or absorbances.
    Returns:
        corrected: (N, B) SNV-corrected spectra.
    """
    if spectra.ndim == 1:
        spectra = spectra[np.newaxis, :]
    mean = spectra.mean(axis=1, keepdims=True)
    std = spectra.std(axis=1, keepdims=True)
    std = np.where(std < 1e-8, 1.0, std)
    return (spectra - mean) / std


# ---------------------------------------------------------------------------
# 2. Savitzky-Golay Filtering & Differentiation
# ---------------------------------------------------------------------------

def savitzky_golay(
    spectra: np.ndarray,
    window_length: int = 11,
    polyorder: int = 2,
    deriv: int = 1,
) -> np.ndarray:
    """
    Savitzky-Golay smoothing and/or differentiation.
    Default: 1st derivative (deriv=1) for scatter correction + feature sharpening.

    Args:
        spectra:       (N, B) input spectra.
        window_length: Filter window, must be odd, ≥ polyorder + 2.
        polyorder:     Polynomial order.
        deriv:         Derivative order (0=smooth, 1=1st deriv, 2=2nd deriv).
    Returns:
        filtered: (N, B) filtered spectra.
    """
    single = spectra.ndim == 1
    if single:
        spectra = spectra[np.newaxis, :]
    result = np.array([
        savgol_filter(row, window_length=window_length, polyorder=polyorder, deriv=deriv)
        for row in spectra
    ])
    return result[0] if single else result


# ---------------------------------------------------------------------------
# 3. Standard Preprocessing Chain (SNV → 1st derivative)
# ---------------------------------------------------------------------------

def preprocess(spectra: np.ndarray, deriv: int = 1) -> np.ndarray:
    """
    Full spectral preprocessing chain applied in all AAHAR NIR models:
      1. Convert raw counts to absorbance: A = log10(white_ref / I)
      2. SNV correction
      3. Savitzky-Golay (11, 2) 1st derivative

    Args:
        spectra: (N, B) or (B,) raw sensor counts.
        deriv:   Derivative order, default 1.
    Returns:
        (N, B) or (B,) preprocessed spectra.
    """
    single = spectra.ndim == 1
    if single:
        spectra = spectra[np.newaxis, :]

    # White reference is 58000 counts, dark is 120.
    # Clip to avoid log(0)
    white_ref = 58000.0
    dark_ref = 120.0
    absorbance = np.log10(np.clip(white_ref, 1.0, None) / np.clip(spectra - dark_ref, 0.1, None))
    corrected = snv(absorbance)
    derivative = savitzky_golay(corrected, window_length=11, polyorder=2, deriv=deriv)
    return derivative[0] if single else derivative


# ---------------------------------------------------------------------------
# 4. Piecewise Direct Standardisation (PDS) — Calibration Transfer
# ---------------------------------------------------------------------------

class PDSTransfer:
    """
    Piecewise Direct Standardisation for inter-device calibration transfer.
    Fits a transform from device B's spectra → device A's (reference) spectra,
    using the overlap window approach described by Wang et al. (1991).

    Usage:
        pds = PDSTransfer(window_size=5)
        pds.fit(ref_spectra, target_spectra)       # align slave to master
        corrected = pds.transform(new_spectra)
    """

    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self.B: Optional[np.ndarray] = None   # Transfer matrix (n_bands, n_bands)
        self.n_bands: Optional[int] = None

    def fit(self, ref: np.ndarray, target: np.ndarray) -> "PDSTransfer":
        """
        Fit the piecewise transfer matrix.

        Args:
            ref:    (N, B) spectra from reference/master instrument.
            target: (N, B) spectra from slave instrument for the same samples.
        Returns:
            self
        """
        assert ref.shape == target.shape
        N, B = ref.shape
        self.n_bands = B
        w = self.window_size
        half_w = w // 2
        B_mat = np.zeros((B, B))

        for i in range(B):
            lo = max(0, i - half_w)
            hi = min(B, i + half_w + 1)
            Xw = target[:, lo:hi]    # N × window
            y = ref[:, i]            # N
            # Ridge regression: (Xw'Xw + λI)^-1 Xw' y
            lam = 1e-6 * np.trace(Xw.T @ Xw) / max(Xw.shape[1], 1)
            A = Xw.T @ Xw + lam * np.eye(Xw.shape[1])
            b_coeff = solve(A, Xw.T @ y, assume_a='pos')
            B_mat[i, lo:hi] = b_coeff

        self.B = B_mat
        return self

    def transform(self, spectra: np.ndarray) -> np.ndarray:
        """Apply the transfer matrix to new spectra from the slave instrument."""
        assert self.B is not None, "Call fit() before transform()"
        single = spectra.ndim == 1
        if single:
            spectra = spectra[np.newaxis, :]
        result = spectra @ self.B.T
        return result[0] if single else result


# ---------------------------------------------------------------------------
# 5. Mahalanobis Distance — Out-of-Distribution Detection
# ---------------------------------------------------------------------------

class MahalanobisOOD:
    """
    Detects out-of-distribution (OOD) samples that are unlike the training set.
    Uses the Mahalanobis distance to the training set centroid in PCA space.

    A sample with distance > threshold is flagged in_distribution=False.
    The UI then shows: "This sample looks unlike anything I've been trained on — please send it to a lab."
    """

    def __init__(self, n_components: int = 20, threshold_percentile: float = 99.0):
        self.n_components = n_components
        self.threshold_percentile = threshold_percentile
        self.mean_: Optional[np.ndarray] = None
        self.components_: Optional[np.ndarray] = None  # (n_components, n_bands)
        self.inv_cov_: Optional[np.ndarray] = None
        self.threshold_: Optional[float] = None

    def fit(self, X: np.ndarray) -> "MahalanobisOOD":
        """Fit on preprocessed training spectra (N, B)."""
        self.mean_ = X.mean(axis=0)
        Xc = X - self.mean_
        # Thin SVD for PCA
        U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
        self.components_ = Vt[:self.n_components, :]
        # Project to PCA scores
        scores = Xc @ self.components_.T    # (N, n_components)
        cov = (scores.T @ scores) / max(len(scores) - 1, 1)
        reg = 1e-6 * np.eye(self.n_components)
        self.inv_cov_ = np.linalg.inv(cov + reg)
        # Compute distances on training set to determine threshold
        dists = self._distances(X)
        self.threshold_ = float(np.percentile(dists, self.threshold_percentile))
        return self

    def _distances(self, X: np.ndarray) -> np.ndarray:
        """Compute Mahalanobis distances for each sample."""
        Xc = X - self.mean_
        scores = Xc @ self.components_.T    # (N, n_components)
        # Mahalanobis: sqrt(s @ inv_cov @ s.T) per row
        return np.array([
            float(np.sqrt(np.maximum(0.0, s @ self.inv_cov_ @ s)))
            for s in scores
        ])

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Returns (in_distribution: bool array, distances: float array).
        in_distribution=True means the sample is within the training manifold.
        """
        assert self.threshold_ is not None, "Call fit() first"
        single = X.ndim == 1
        if single:
            X = X[np.newaxis, :]
        dists = self._distances(X)
        in_dist = dists <= self.threshold_
        return (in_dist[0], float(dists[0])) if single else (in_dist, dists)

    def state_dict(self) -> Dict:
        """Serialise for embedding in the mobile model registry."""
        return {
            "mean": self.mean_.tolist(),
            "components": self.components_.tolist(),
            "inv_cov": self.inv_cov_.tolist(),
            "threshold": self.threshold_,
        }

    @classmethod
    def from_state_dict(cls, d: Dict) -> "MahalanobisOOD":
        obj = cls()
        obj.mean_ = np.array(d["mean"])
        obj.components_ = np.array(d["components"])
        obj.inv_cov_ = np.array(d["inv_cov"])
        obj.threshold_ = d["threshold"]
        return obj
