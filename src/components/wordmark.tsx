import Image from "next/image";
import kinraLogo from "../../public/brand/kinra-logo.png";

/**
 * Text wordmark for the OneSeiMangkeiSEZ product name. The official KINRA logo is `KinraLogo` below.
 */
export function Wordmark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      <span className={inverted ? "text-white" : "text-ink"}>One</span>
      <span className={inverted ? "text-sky-300" : "text-brand-600"}>SeiMangkei</span>
      <span className={inverted ? "text-white" : "text-ink"}>SEZ</span>
    </span>
  );
}

/** Official KINRA Sei Mangkei logo (transparent PNG, cropped). Best on light backgrounds. */
export function KinraLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return <Image src={kinraLogo} alt="KINRA Sei Mangkei" className={className} priority />;
}
