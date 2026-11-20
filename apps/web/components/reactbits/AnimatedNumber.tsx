'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  formatComma?: boolean;
  className?: string;
}

export default function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  formatComma = false,
  className = '',
}: AnimatedNumberProps) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (latest) => {
    let str = latest.toFixed(decimals);
    if (formatComma) {
      const parts = str.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      str = parts.join(',');
    } else {
      str = str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    return `${prefix}${str}${suffix}`;
  });

  const [currentText, setCurrentText] = useState<string>(`${prefix}${value}${suffix}`);

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on('change', (v) => setCurrentText(v));
    return () => unsubscribe();
  }, [value, spring, display, prefix, suffix]);

  return <motion.span className={className}>{currentText}</motion.span>;
}
