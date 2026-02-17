import flowgrammersLogoWhite from "@/assets/logo-flowgrammers.png";
import flowgrammersLogoDark from "@/assets/logo-flowgrammers-dark.png";
import { useTheme } from "@/contexts/ThemeContext";

interface FlowgrammersLogoProps {
  height?: number;
  className?: string;
}

export function FlowgrammersLogo({ height = 32, className = "" }: FlowgrammersLogoProps) {
  const { theme } = useTheme();
  const src = theme === "dark" ? flowgrammersLogoWhite : flowgrammersLogoDark;

  return (
    <img
      src={src}
      alt="Flowgrammers"
      style={{ height, width: "auto" }}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
