import { useMemo } from "react";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import PokemonCard from "../PokemonCard";
import DraggableSearchCard from "./DraggableSearchCard";
import { Tab } from "@headlessui/react";
import { Fragment } from "react";

// Helper to transform raw URLs to minimal card objects understood by the binder context
const mapUrlsToCards = (urls) => {
  return urls.map((url, idx) => {
    const cleanUrl = url.trim();
    const filename = cleanUrl.split("/").pop() || `sleeve-${idx + 1}`;
    const id = `sleeve-${filename.replace(/[^a-zA-Z0-9-_]/g, "")}`;

    return {
      id,
      name: `Sleeve ${idx + 1}`,
      image: cleanUrl,
      imageSmall: cleanUrl,
      types: [],
      set: { id: "sleeves", name: "Sleeves", series: "Custom" },
    };
  });
};

// Hard-coded URLs for sleeve images
const ETB_URLS = [
  "https://i.postimg.cc/DwGnVQ1H/image-1.jpg",
  "https://i.postimg.cc/G34fSLFS/image-10.jpg",
  "https://i.postimg.cc/7bv0KM3D/image-11.jpg",
  "https://i.postimg.cc/Qx5yhfnQ/image-12.jpg",
  "https://i.postimg.cc/0N5WGP5n/image-13.jpg",
  "https://i.postimg.cc/13QYtDLL/image-14.jpg",
  "https://i.postimg.cc/g2Ht6npr/image-15.jpg",
  "https://i.postimg.cc/3wLLnVdT/image-16.jpg",
  "https://i.postimg.cc/d3C4Q0ns/image-17.jpg",
  "https://i.postimg.cc/zBVxM7gR/image-18.jpg",
  "https://i.postimg.cc/26M0fWQ9/image-19.jpg",
  "https://i.postimg.cc/9fjVc4pM/image-2.jpg",
  "https://i.postimg.cc/4NCWLzNm/image-20.jpg",
  "https://i.postimg.cc/Y2LXzX75/image-21.jpg",
  "https://i.postimg.cc/CLjmWzzJ/image-22.jpg",
  "https://i.postimg.cc/htcpgcmn/image-23.jpg",
  "https://i.postimg.cc/pLCkL4QF/image-24.jpg",
  "https://i.postimg.cc/s22mQmK0/image-25.jpg",
  "https://i.postimg.cc/76FnRk4p/image-26.jpg",
  "https://i.postimg.cc/3wbBgGcr/image-27.jpg",
  "https://i.postimg.cc/Qt9qSM2Q/image-28.jpg",
  "https://i.postimg.cc/x8L3D4Tq/image-29.jpg",
  "https://i.postimg.cc/mrN4kbXS/image-3.jpg",
  "https://i.postimg.cc/3rGBvdC7/image-30.jpg",
  "https://i.postimg.cc/nct1Yp0m/image-31.jpg",
  "https://i.postimg.cc/FsgVT8BB/image-32.jpg",
  "https://i.postimg.cc/3xtCTp7j/image-33.jpg",
  "https://i.postimg.cc/CxhHXJyL/image-34.jpg",
  "https://i.postimg.cc/YSjNq9q5/image-35.jpg",
  "https://i.postimg.cc/vmjr1s4c/image-36.jpg",
  "https://i.postimg.cc/PxwmYRDK/image-37.jpg",
  "https://i.postimg.cc/qqH2LxXr/image-38.jpg",
  "https://i.postimg.cc/yxhcr3vZ/image-39.jpg",
  "https://i.postimg.cc/W35Pm5PF/image-4.jpg",
  "https://i.postimg.cc/DyFq45wd/image-40.jpg",
  "https://i.postimg.cc/057YNhPy/image-41.jpg",
  "https://i.postimg.cc/8PHLRWF8/image-42.jpg",
  "https://i.postimg.cc/wjjL0vJ1/image-43.jpg",
  "https://i.postimg.cc/43KtRSWZ/image-44.jpg",
  "https://i.postimg.cc/43rcfQ0c/image-45.jpg",
  "https://i.postimg.cc/W1YrKv6X/image-46.png",
  "https://i.postimg.cc/FR3L7JtB/image-47.jpg",
  "https://i.postimg.cc/8cbfbQzd/image-48.png",
  "https://i.postimg.cc/595zJvSH/image-49.jpg",
  "https://i.postimg.cc/pTWHng3M/image-5.jpg",
  "https://i.postimg.cc/VvwbMLmL/image-50.jpg",
  "https://i.postimg.cc/9FW7QMLL/image-51.jpg",
  "https://i.postimg.cc/4NBh7gMs/image-52.jpg",
  "https://i.postimg.cc/pdn96ndL/image-53.jpg",
  "https://i.postimg.cc/g2jL37FR/image-54.jpg",
  "https://i.postimg.cc/qvFhwG4F/image-55.jpg",
  "https://i.postimg.cc/XJSZS7Zc/image-56.jpg",
  "https://i.postimg.cc/7635x80v/image-57.jpg",
  "https://i.postimg.cc/WzshzWwd/image-58.jpg",
  "https://i.postimg.cc/SRVjM6gD/image-59.png",
  "https://i.postimg.cc/fykQ8YwH/image-6.jpg",
  "https://i.postimg.cc/RCTWymvK/image-60.png",
  "https://i.postimg.cc/VLLJchNT/image-61.jpg",
  "https://i.postimg.cc/hPyf40zG/image-62.jpg",
  "https://i.postimg.cc/vZCTfHvF/image-63.jpg",
  "https://i.postimg.cc/fRVkV0mf/image-64.jpg",
  "https://i.postimg.cc/PqZx4s6L/image-65.jpg",
  "https://i.postimg.cc/1tQz7CTv/image-66.jpg",
  "https://i.postimg.cc/Hx9kq01d/image-67.jpg",
  "https://i.postimg.cc/prVLR9P8/image-68.jpg",
  "https://i.postimg.cc/sxnDXV2L/image-69.jpg",
  "https://i.postimg.cc/gJTvZPrx/image-7.jpg",
  "https://i.postimg.cc/2jT5Txxx/image-70.jpg",
  "https://i.postimg.cc/vHBZK6qw/image-71.jpg",
  "https://i.postimg.cc/5NR2WNTY/image-72.jpg",
  "https://i.postimg.cc/g2LkzbbM/image-73.jpg",
  "https://i.postimg.cc/W4RptY2s/image-74.jpg",
  "https://i.postimg.cc/cJQx37Hw/image-75.jpg",
  "https://i.postimg.cc/9MCWY4RS/image-76.jpg",
  "https://i.postimg.cc/SsdmTycK/image-77.jpg",
  "https://i.postimg.cc/FzKNw2xV/image-78.jpg",
  "https://i.postimg.cc/Rhb4mXs5/image-79.jpg",
  "https://i.postimg.cc/QCKcgnW0/image-8.jpg",
  "https://i.postimg.cc/zDdJTGJt/image-80.jpg",
  "https://i.postimg.cc/15fyB1X9/image-81.jpg",
  "https://i.postimg.cc/yYtsrp30/image-82.jpg",
  "https://i.postimg.cc/pV36wwkV/image-9.jpg",
  "https://i.postimg.cc/X7sbmwQc/bf98f41deabc58fe5a1bc8ca6ee47fe0.jpg",
  "https://i.postimg.cc/jq83rZY5/s-l1600.png",
];

const POKEMON_CENTER_URLS = [
  "https://i.postimg.cc/hG5V6BgK/image-1.jpg",
  "https://i.postimg.cc/qqgXgvLh/image-10.jpg",
  "https://i.postimg.cc/wvXnF08c/image-100.jpg",
  "https://i.postimg.cc/ZKKXF8fp/image-101.jpg",
  "https://i.postimg.cc/KjQwhjY1/image-102.jpg",
  "https://i.postimg.cc/NGxWHJxQ/image-103.jpg",
  "https://i.postimg.cc/yYQtfD55/image-104.jpg",
  "https://i.postimg.cc/0yz3h81N/image-105.jpg",
  "https://i.postimg.cc/sgb8rt34/image-106.jpg",
  "https://i.postimg.cc/LsfW6NXK/image-107.jpg",
  "https://i.postimg.cc/gJWTw8Xw/image-108.jpg",
  "https://i.postimg.cc/FRVn0z3T/image-109.jpg",
  "https://i.postimg.cc/D0DQG3jC/image-11.jpg",
  "https://i.postimg.cc/PJfVyHMT/image-110.jpg",
  "https://i.postimg.cc/sxn60LnS/image-111.jpg",
  "https://i.postimg.cc/15j7GLV1/image-112.jpg",
  "https://i.postimg.cc/yYdrSVdT/image-113.jpg",
  "https://i.postimg.cc/jqvF5Ws5/image-114.jpg",
  "https://i.postimg.cc/zGHt00Tb/image-115.jpg",
  "https://i.postimg.cc/N01NwFJQ/image-116.jpg",
  "https://i.postimg.cc/bvX6MkR6/image-117.jpg",
  "https://i.postimg.cc/vBb08ykf/image-118.jpg",
  "https://i.postimg.cc/26G2VJNJ/image-119.jpg",
  "https://i.postimg.cc/59kST84w/image-12.jpg",
  "https://i.postimg.cc/qMSQhyWk/image-120.jpg",
  "https://i.postimg.cc/qMhxTgqW/image-13.jpg",
  "https://i.postimg.cc/rw5GDbSJ/image-14.jpg",
  "https://i.postimg.cc/4NDbNZhy/image-15.jpg",
  "https://i.postimg.cc/bv8xkTgj/image-16.jpg",
  "https://i.postimg.cc/cJmQmnkt/image-17.jpg",
  "https://i.postimg.cc/d1NGMKYq/image-18.jpg",
  "https://i.postimg.cc/26SnXSgc/image-19.jpg",
  "https://i.postimg.cc/4y3wt5J3/image-2.jpg",
  "https://i.postimg.cc/yxJcsr10/image-20.jpg",
  "https://i.postimg.cc/WzQr36zC/image-21.jpg",
  "https://i.postimg.cc/QNPc0smm/image-22.jpg",
  "https://i.postimg.cc/9F7ZkSNh/image-23.jpg",
  "https://i.postimg.cc/jSYPYXGJ/image-24.jpg",
  "https://i.postimg.cc/x1GHfm2p/image-25.jpg",
  "https://i.postimg.cc/YSbWgwj1/image-26.jpg",
  "https://i.postimg.cc/8C1vjCkp/image-27.jpg",
  "https://i.postimg.cc/63qGf1GF/image-28.jpg",
  "https://i.postimg.cc/0Q4KWdYj/image-29.jpg",
  "https://i.postimg.cc/ZnDHLdRx/image-3.jpg",
  "https://i.postimg.cc/FzJd2dpZ/image-30.jpg",
  "https://i.postimg.cc/yW4gB1rz/image-31.jpg",
  "https://i.postimg.cc/59HsxskP/image-32.jpg",
  "https://i.postimg.cc/WpQXt0Bs/image-33.jpg",
  "https://i.postimg.cc/MGKYg5Qm/image-34.jpg",
  "https://i.postimg.cc/t4z5rwYg/image-35.jpg",
  "https://i.postimg.cc/jdPvfLTP/image-36.jpg",
  "https://i.postimg.cc/t4bkNpRf/image-37.jpg",
  "https://i.postimg.cc/bJZ9wvLG/image-38.jpg",
  "https://i.postimg.cc/9f8B29P5/image-39.jpg",
  "https://i.postimg.cc/Wp95VQnq/image-4.jpg",
  "https://i.postimg.cc/90TPyN6C/image-40.jpg",
  "https://i.postimg.cc/44h1Cmmq/image-41.jpg",
  "https://i.postimg.cc/1tbcnZYv/image-42.jpg",
  "https://i.postimg.cc/sg3PZmwC/image-43.jpg",
  "https://i.postimg.cc/qMVxp4KR/image-44.jpg",
  "https://i.postimg.cc/Gp2kXpWM/image-45.jpg",
  "https://i.postimg.cc/nhT4KmPj/image-46.jpg",
  "https://i.postimg.cc/nc4YzgK1/image-47.jpg",
  "https://i.postimg.cc/ZRv6hMKp/image-48.jpg",
  "https://i.postimg.cc/mkxCZytq/image-49.jpg",
  "https://i.postimg.cc/zXV0G0tt/image-5.jpg",
  "https://i.postimg.cc/L5Z2HjrJ/image-50.jpg",
  "https://i.postimg.cc/PfB81yfF/image-51.jpg",
  "https://i.postimg.cc/4NVHPcm4/image-52.jpg",
  "https://i.postimg.cc/056w6Fvw/image-53.jpg",
  "https://i.postimg.cc/nMbZMCJ0/image-54.jpg",
  "https://i.postimg.cc/cLcgyNRV/image-55.jpg",
  "https://i.postimg.cc/sgzQN2hY/image-56.jpg",
  "https://i.postimg.cc/jjdWRkvC/image-57.jpg",
  "https://i.postimg.cc/Zq7WnFDH/image-58.jpg",
  "https://i.postimg.cc/B6RtcZ31/image-59.jpg",
  "https://i.postimg.cc/GmDKk91v/image-6.jpg",
  "https://i.postimg.cc/VvMv7ysZ/image-60.jpg",
  "https://i.postimg.cc/xCXczJw2/image-61.jpg",
  "https://i.postimg.cc/sfZMfWPP/image-62.jpg",
  "https://i.postimg.cc/VLQdJN4x/image-63.jpg",
  "https://i.postimg.cc/SN6jCpvJ/image-64.jpg",
  "https://i.postimg.cc/2SCyxXsT/image-65.jpg",
  "https://i.postimg.cc/x1gCp3YQ/image-66.jpg",
  "https://i.postimg.cc/FKRKMksL/image-67.jpg",
  "https://i.postimg.cc/7LWLwPfQ/image-68.jpg",
  "https://i.postimg.cc/ZRv5RkNY/image-69.jpg",
  "https://i.postimg.cc/43b1SMyd/image-7.jpg",
  "https://i.postimg.cc/Vvjsqj43/image-70.jpg",
  "https://i.postimg.cc/bYbvfh83/image-71.jpg",
  "https://i.postimg.cc/fy4TSH7c/image-72.png",
  "https://i.postimg.cc/hP1Ph1Xm/image-73.jpg",
  "https://i.postimg.cc/xT21041Y/image-74.jpg",
  "https://i.postimg.cc/Z5YYNvNM/image-75.jpg",
  "https://i.postimg.cc/HkSY9W4s/image-76.jpg",
  "https://i.postimg.cc/mrtbXx83/image-77.jpg",
  "https://i.postimg.cc/0NF9htBT/image-78.jpg",
  "https://i.postimg.cc/qRKprsfz/image-79.jpg",
  "https://i.postimg.cc/JnrQVqHQ/image-8.jpg",
  "https://i.postimg.cc/cCN0LvZT/image-80.jpg",
  "https://i.postimg.cc/ZnFZBJ5m/image-81.jpg",
  "https://i.postimg.cc/FFjhnVg6/image-82.jpg",
  "https://i.postimg.cc/7Y9wqPRM/image-83.jpg",
  "https://i.postimg.cc/65tBs4Mp/image-84.jpg",
  "https://i.postimg.cc/8zCDcQQ8/image-85.jpg",
  "https://i.postimg.cc/VNr89qkD/image-86.jpg",
  "https://i.postimg.cc/cL5W890v/image-87.jpg",
  "https://i.postimg.cc/YS5wdv4k/image-88.jpg",
  "https://i.postimg.cc/3R2QV3pG/image-89.jpg",
  "https://i.postimg.cc/5tM3p1xT/image-9.jpg",
  "https://i.postimg.cc/NFYvwZ7z/image-90.jpg",
  "https://i.postimg.cc/C5NTMJcL/image-91.jpg",
  "https://i.postimg.cc/c1MNc4dy/image-92.jpg",
  "https://i.postimg.cc/TYdvNMPy/image-93.jpg",
  "https://i.postimg.cc/T3hMGVgf/image-94.jpg",
  "https://i.postimg.cc/BQm9dY8m/image-95.jpg",
  "https://i.postimg.cc/qvYf7Nxn/image-96.jpg",
  "https://i.postimg.cc/SRm3PCm0/image-97.jpg",
  "https://i.postimg.cc/fLn6x1FR/image-98.jpg",
  "https://i.postimg.cc/SKzBYmgP/image-99.jpg",
];

// Ultra Pro sleeves
const ULTRA_PRO_URLS = [
  "https://i.postimg.cc/ZY7mD8fP/image-1.jpg",
  "https://i.postimg.cc/nLzYTtMG/image-10.jpg",
  "https://i.postimg.cc/7LW1WQ28/image-11.jpg",
  "https://i.postimg.cc/fy4cwtC8/image-12.jpg",
  "https://i.postimg.cc/26LdRFQq/image-13.jpg",
  "https://i.postimg.cc/gjvvrzBm/image-14.jpg",
  "https://i.postimg.cc/8PmRSC6b/image-15.jpg",
  "https://i.postimg.cc/RZCcVz1x/image-16.jpg",
  "https://i.postimg.cc/Wprm58pC/image-17.jpg",
  "https://i.postimg.cc/fTNcpdJL/image-18.jpg",
  "https://i.postimg.cc/TPFm9LzT/image-19.jpg",
  "https://i.postimg.cc/CL9gwFpz/image-2.jpg",
  "https://i.postimg.cc/rwh5DYg0/image-20.jpg",
  "https://i.postimg.cc/bvskkHF6/image-21.jpg",
  "https://i.postimg.cc/mD996Z4C/image-22.jpg",
  "https://i.postimg.cc/90j933XS/image-23.jpg",
  "https://i.postimg.cc/L5B12yns/image-24.jpg",
  "https://i.postimg.cc/FsNSDQBk/image-25.jpg",
  "https://i.postimg.cc/J7bJNhPW/image-26.jpg",
  "https://i.postimg.cc/XvGBpNpm/image-27.jpg",
  "https://i.postimg.cc/X7LCPDRH/image-28.jpg",
  "https://i.postimg.cc/SxKMbfqy/image-29.png",
  "https://i.postimg.cc/KzCNRsGr/image-3.jpg",
  "https://i.postimg.cc/XYDyjB79/image-30.png",
  "https://i.postimg.cc/sX5B4nPJ/image-31.png",
  "https://i.postimg.cc/MHxnPydJ/image-32.png",
  "https://i.postimg.cc/LscYfdPX/image-33.jpg",
  "https://i.postimg.cc/x8RcWc4J/image-34.jpg",
  "https://i.postimg.cc/fWjt3rRz/image-35.jpg",
  "https://i.postimg.cc/GhLBvx4k/image-36.jpg",
  "https://i.postimg.cc/x1qc4jy8/image-37.jpg",
  "https://i.postimg.cc/0y3bRgcf/image-38.jpg",
  "https://i.postimg.cc/fT8VCSd1/image-39.jpg",
  "https://i.postimg.cc/zDR7957d/image-4.jpg",
  "https://i.postimg.cc/nzfrr489/image-40.jpg",
  "https://i.postimg.cc/5tCjfPrM/image-41.jpg",
  "https://i.postimg.cc/d1R1yhvH/image-42.jpg",
  "https://i.postimg.cc/PJtqzd5t/image-43.jpg",
  "https://i.postimg.cc/Y0bCdTvQ/image-44.png",
  "https://i.postimg.cc/2895hRRD/image-45.png",
  "https://i.postimg.cc/593y9Qsj/image-46.jpg",
  "https://i.postimg.cc/5N20X9rg/image-47.jpg",
  "https://i.postimg.cc/g2fktV2t/image-48.jpg",
  "https://i.postimg.cc/43V4DYKf/image-49.jpg",
  "https://i.postimg.cc/MK7DpDhV/image-5.jpg",
  "https://i.postimg.cc/htJt0yc7/image-50.jpg",
  "https://i.postimg.cc/qRGJ7WXW/image-51.jpg",
  "https://i.postimg.cc/tJCXnDBJ/image-52.jpg",
  "https://i.postimg.cc/hjn4cKx9/image-53.jpg",
  "https://i.postimg.cc/Gt7bFYfQ/image-54.jpg",
  "https://i.postimg.cc/gcNcbF0Z/image-55.jpg",
  "https://i.postimg.cc/3JqKWXmr/image-56.jpg",
  "https://i.postimg.cc/rFsV8ndY/image-57.jpg",
  "https://i.postimg.cc/kgt7S2vQ/image-58.jpg",
  "https://i.postimg.cc/s2Yynb81/image-59.jpg",
  "https://i.postimg.cc/hvx0xbhF/image-6.jpg",
  "https://i.postimg.cc/xdDn396W/image-60.jpg",
  "https://i.postimg.cc/HnxgknL7/image-61.jpg",
  "https://i.postimg.cc/9Mc2sJ5b/image-62.jpg",
  "https://i.postimg.cc/4dwGGVXg/image-63.jpg",
  "https://i.postimg.cc/wMGdyzt4/image-64.jpg",
  "https://i.postimg.cc/vH4yR4jJ/image-65.jpg",
  "https://i.postimg.cc/m2fj4q6T/image-7.jpg",
  "https://i.postimg.cc/y87TgRH5/image-8.jpg",
  "https://i.postimg.cc/x1g3Kdjd/image-9.jpg",
];

const CATEGORY_MAP = {
  ETB: ETB_URLS,
  "Pokemon Center": POKEMON_CENTER_URLS,
  "Ultra Pro": ULTRA_PRO_URLS,
};

const SleevesTab = ({
  selectedMap = {},
  onCardSelect,
  isCardSelected,
  onIncrease,
  onDecrease,
  compact = false,
}) => {
  const cardsByCategory = useMemo(() => {
    const result = {};
    Object.keys(CATEGORY_MAP).forEach((key) => {
      result[key] = mapUrlsToCards(CATEGORY_MAP[key]);
    });
    return result;
  }, []);

  const categoryKeys = Object.keys(cardsByCategory);

  return (
    <Tab.Group as="div" className="flex flex-col h-full">
      <div className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 border-b border-border">
        <Tab.List className="flex space-x-1 bg-slate-200 dark:bg-slate-900/80 rounded-lg p-1">
          {categoryKeys.map((cat) => (
            <Tab key={cat} as={Fragment}>
              {({ selected }) => (
                <button
                  className={`w-full py-2 text-sm font-medium leading-5 rounded-lg transition-all focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60 ${
                    selected
                      ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow"
                      : "text-slate-700 dark:text-slate-300 hover:bg-white/[0.5] dark:hover:bg-slate-800/[0.5]"
                  }`}
                >
                  {cat}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>
      </div>

      <Tab.Panels className="flex-1 min-h-0">
        {categoryKeys.map((cat) => (
          <Tab.Panel key={cat} className="h-full">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 h-full">
              <div
                className={`grid gap-2 ${
                  compact
                    ? "grid-cols-3"
                    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-3"
                }`}
              >
                {cardsByCategory[cat].map((card) => (
                  <div key={card.id} className="relative">
                    {compact ? (
                      <DraggableSearchCard card={card} />
                    ) : (
                      <PokemonCard
                        card={card}
                        onClick={() => onCardSelect(card)}
                        className={`cursor-pointer transition-all ${
                          isCardSelected(card.id)
                            ? "ring-2 ring-blue-500 scale-105"
                            : "hover:scale-105"
                        }`}
                      />
                    )}
                    {isCardSelected(card.id) && (
                      <>
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg pointer-events-none" />
                        <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded shadow">
                          {selectedMap[card.id]?.count || 1}
                        </div>
                        <div className="absolute bottom-1 right-1 flex flex-col gap-0.5 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onIncrease(card);
                            }}
                            className="w-6 h-6 bg-white/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full flex items-center justify-center shadow hover:bg-blue-100 dark:hover:bg-slate-600"
                            aria-label="Increase quantity"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDecrease(card);
                            }}
                            className="w-6 h-6 bg-white/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full flex items-center justify-center shadow hover:bg-blue-100 dark:hover:bg-slate-600"
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};

export default SleevesTab;
