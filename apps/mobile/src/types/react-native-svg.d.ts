import * as React from 'react';
import { ViewProps } from 'react-native';

declare module 'react-native-svg' {
  export interface SvgProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    color?: string;
    children?: React.ReactNode;
  }

  export const Svg: React.ComponentType<SvgProps>;
  export const Path: React.ComponentType<any>;
  export const Circle: React.ComponentType<any>;
  export const G: React.ComponentType<any>;
  export const Line: React.ComponentType<any>;
  export const Rect: React.ComponentType<any>;
  export const Polyline: React.ComponentType<any>;
  export const Polygon: React.ComponentType<any>;
  export default Svg;
}
