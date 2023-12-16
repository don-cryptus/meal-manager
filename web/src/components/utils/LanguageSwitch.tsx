"use client";

import { SwitchProps, useSwitch } from "@nextui-org/switch";
import de from "@public/images/flags/de.svg";
import en from "@public/images/flags/en.svg";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import clsx from "clsx";
import Image from "next/image";
import React from "react";

interface LanguageSwitchProps {
  className?: string;
  classNames?: SwitchProps["classNames"];
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  className,
  classNames,
}) => {
  const {
    Component,
    slots,
    isSelected,
    getBaseProps,
    getInputProps,
    getWrapperProps,
  } = useSwitch({});

  return (
    <Component {...getBaseProps()}>
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div
        {...getWrapperProps()}
        className={slots.wrapper({
          color: "default",
          className: clsx(
            "h-10 w-10 cursor-pointer rounded-lg bg-opacity-30 p-2 hover:opacity-80 group-data-[selected=true]:bg-opacity-20",
            className,
            classNames?.base,
          ),
        })}
      >
        {isSelected ? <Image src={de} alt="de" /> : <Image src={en} alt="en" />}
      </div>
    </Component>
  );
};