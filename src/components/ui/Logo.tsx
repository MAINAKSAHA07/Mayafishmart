import Image from "next/image";

export function Logo({
  size = 44,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Maya Fish Mart"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full ${className}`}
    />
  );
}
