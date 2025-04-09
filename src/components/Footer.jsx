import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    const toggleNightMode = () => {
      const now = new Date();
      const hours = now.getUTCHours() + 8; // 转换为北京时间（UTC+8）
      const adjustedHours = hours >= 24 ? hours - 24 : hours; // 防止小时数超过 24

      // 判断是否为深夜模式时间段（晚上 7 点到早上 7 点）
      if (adjustedHours >= 19 || adjustedHours < 7) {
        setIsNightMode(true);
        document.body.classList.add('night-mode');
      } else {
        setIsNightMode(false);
        document.body.classList.remove('night-mode');
      }
    };

    toggleNightMode(); // 页面加载时执行
    const interval = setInterval(toggleNightMode, 60000); // 每分钟检查一次时间

    return () => clearInterval(interval); // 清理定时器
  }, []);

  return (
    <footer className={`w-full h-1/12 text-center flex flex-col justify-center items-center ${isNightMode ? 'bg-gray-800 text-white' : 'bg-slate-200 text-black'}`}>
      <div>
        <p className="text-xs">
          Copyright Ⓒ 2024 All rights reserved. 请勿上传违反中国法律的图片，违者后果自负。 本程序基于Cloudflare Pages，开源于
          <Link
            href="https://github.com/x-dr/telegraph-Image"
            className="text-blue-300 hover:text-red-900 ml-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Telegraph-Image
          </Link>
        </p>
      </div>
    </footer>
  );
}
