"use client";

import "nprogress/nprogress.css";
import "./.css";

import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import { useEffect } from "react";

NProgress.configure({ showSpinner: false, speed: 500 });

export const Progress = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    NProgress.start();
    NProgress.done();

    return () => {
      NProgress.done();
    };
  }, [pathname]);

  return null;
};
