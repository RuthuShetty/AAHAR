/**
 * AAHAR Handheld Scanner — Version & Build Metadata
 */

#pragma once
#ifndef AAHAR_VERSION_H
#define AAHAR_VERSION_H

#define AAHAR_FW_VERSION_MAJOR 1
#define AAHAR_FW_VERSION_MINOR 2
#define AAHAR_FW_VERSION_PATCH 4
#define AAHAR_FW_VERSION_STRING "v1.2.4"
#define AAHAR_HW_REVISION "REV_C3"
#define AAHAR_BUILD_DATE __DATE__ " " __TIME__

namespace aahar::version {

struct FirmwareInfo {
    const char* version_str     = AAHAR_FW_VERSION_STRING;
    const char* hardware_rev    = AAHAR_HW_REVISION;
    const char* build_timestamp = AAHAR_BUILD_DATE;
    uint32_t schema_version     = 3; // Aligned with contracts schema_version
};

} // namespace aahar::version

#endif // AAHAR_VERSION_H
