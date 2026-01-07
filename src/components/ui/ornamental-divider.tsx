import Image from "next/image";

export function OrnamentalDivider(): React.ReactElement {
  return (
    <div className="flex items-center gap-[2px]">
      <Image
        src="/Flourish.svg"
        alt=""
        width={0}
        height={16}
        className="h-4 w-auto"
        aria-hidden="true"
      />
      <div className="h-px flex-1 bg-stone-300" />
      <Image
        src="/Flourish.svg"
        alt=""
        width={0}
        height={16}
        className="h-4 w-auto scale-x-[-1]"
        aria-hidden="true"
      />
    </div>
  );
}

