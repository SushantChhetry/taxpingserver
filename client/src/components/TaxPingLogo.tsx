import type { CSSProperties, ImgHTMLAttributes } from 'react';
import logo from '../../../src/assets/logo.png';

type TaxPingLogoSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

const SIZE_CLASS_MAP: Record<TaxPingLogoSize, string> = {
  sm: 'tp-logo--sm',
  md: 'tp-logo--md',
  lg: 'tp-logo--lg',
  xl: 'tp-logo--xl',
  xxl: 'tp-logo--xxl',
  xxxl: 'tp-logo--xxxl',
};

type TaxPingLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  size?: TaxPingLogoSize;
  className?: string;
  style?: CSSProperties;
};

export default function TaxPingLogo({
  size = 'md',
  alt = 'TaxPing',
  className = '',
  style,
  ...props
}: TaxPingLogoProps) {
  const classes = ['tp-logo', SIZE_CLASS_MAP[size], className].filter(Boolean).join(' ');

  return <img src={logo} alt={alt} className={classes} style={style} {...props} />;
}
