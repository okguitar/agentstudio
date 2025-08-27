// 简单测试快速排序JavaScript版本
import { quicksort, quicksortInplace } from './quicksort.js';

console.log("=== 快速测试 ===");

// 测试数组
const testArr = [64, 34, 25, 12, 22, 11, 90];
console.log("原数组:", testArr);

// 非原地排序
const sorted1 = quicksort([...testArr]);
console.log("非原地快排:", sorted1);

// 原地排序
const testArr2 = [...testArr];
quicksortInplace(testArr2);
console.log("原地快排:", testArr2);

console.log("测试完成！");