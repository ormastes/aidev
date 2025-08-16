export interface ComponentTheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
}

export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
  theme?: ComponentTheme;
}

export interface EditorConfig {
  language: string;
  theme: string;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}
