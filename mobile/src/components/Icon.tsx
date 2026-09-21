import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';

export interface IconProps {
  name:
    | 'home'
    | 'bunker'
    | 'history'
    | 'settings'
    | 'scan'
    | 'camera'
    | 'truck'
    | 'shield'
    | 'check'
    | 'alert'
    | 'battery'
    | 'bluetooth'
    | 'droplet'
    | 'thermometer'
    | 'lab'
    | 'share'
    | 'book'
    | 'volume'
    | 'compare'
    | 'chevron-right'
    | 'arrow-right'
    | 'close'
    | 'refresh'
    | 'cloud'
    | 'globe'
    | 'info'
    | 'lock';
  size?: number;
  color?: string;
}

export function Icon({ name, size = 18, color = '#334155' }: IconProps) {
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Polyline points="9 22 9 12 15 12 15 22" />
        </Svg>
      );
    case 'bunker':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="3" width="18" height="18" rx="2" />
          <Path d="M3 9h18" />
          <Path d="M3 15h18" />
          <Path d="M9 3v18" />
        </Svg>
      );
    case 'history':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Polyline points="12 6 12 12 16 14" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
      );
    case 'scan':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <Line x1="7" y1="12" x2="17" y2="12" />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <Circle cx="12" cy="13" r="4" />
        </Svg>
      );
    case 'truck':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="1" y="3" width="15" height="13" />
          <Polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <Circle cx="5.5" cy="18.5" r="2.5" />
          <Circle cx="18.5" cy="18.5" r="2.5" />
        </Svg>
      );
    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="20 6 9 17 4 12" />
        </Svg>
      );
    case 'alert':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
        </Svg>
      );
    case 'battery':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="1" y="6" width="18" height="12" rx="2" />
          <Line x1="23" y1="13" x2="23" y2="11" />
        </Svg>
      );
    case 'bluetooth':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
        </Svg>
      );
    case 'droplet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </Svg>
      );
    case 'thermometer':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </Svg>
      );
    case 'lab':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M10 2v7.31L4.69 18.4A2 2 0 0 0 6.4 21.5h11.2a2 2 0 0 0 1.71-3.1L14 9.31V2" />
          <Line x1="8.5" y1="2" x2="15.5" y2="2" />
          <Line x1="6.5" y1="15" x2="17.5" y2="15" />
        </Svg>
      );
    case 'share':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="18" cy="5" r="3" />
          <Circle cx="6" cy="12" r="3" />
          <Circle cx="18" cy="19" r="3" />
          <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </Svg>
      );
    case 'book':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </Svg>
      );
    case 'volume':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <Path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </Svg>
      );
    case 'compare':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M16 3h5v5" />
          <Path d="M4 20L21 3" />
          <Path d="M21 16v5h-5" />
          <Path d="M15 15l6 6" />
          <Path d="M4 4l5 5" />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="9 18 15 12 9 6" />
        </Svg>
      );
    case 'arrow-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Line x1="5" y1="12" x2="19" y2="12" />
          <Polyline points="12 5 19 12 12 19" />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="23 4 23 10 17 10" />
          <Polyline points="1 20 1 14 7 14" />
          <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </Svg>
      );
    case 'cloud':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </Svg>
      );
    case 'globe':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Line x1="2" y1="12" x2="22" y2="12" />
          <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </Svg>
      );
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="16" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12.01" y2="8" />
        </Svg>
      );
    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
      );
    default:
      return null;
  }
}

export default Icon;
