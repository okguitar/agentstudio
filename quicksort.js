/**
 * 快速排序算法的JavaScript实现
 * 包含两个版本：非原地排序和原地排序
 */

/**
 * 快速排序算法实现（非原地版本）
 * 
 * @param {number[]} arr - 待排序的数组
 * @returns {number[]} 排序后的数组
 */
function quicksort(arr) {
    if (arr.length <= 1) {
        return arr;
    }
    
    // 选择基准元素（这里选择中间元素）
    const pivot = arr[Math.floor(arr.length / 2)];
    
    // 分区：小于基准的元素、等于基准的元素、大于基准的元素
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);
    
    // 递归排序并合并结果
    return [...quicksort(left), ...middle, ...quicksort(right)];
}

/**
 * 原地快速排序算法实现（不创建新数组，空间复杂度更优）
 * 
 * @param {number[]} arr - 待排序的数组
 * @param {number} low - 起始索引，默认为0
 * @param {number} high - 结束索引，默认为数组长度-1
 */
function quicksortInplace(arr, low = 0, high = arr.length - 1) {
    if (low < high) {
        // 分区操作，返回基准元素的正确位置
        const pi = partition(arr, low, high);
        
        // 递归排序基准元素左边和右边的子数组
        quicksortInplace(arr, low, pi - 1);
        quicksortInplace(arr, pi + 1, high);
    }
}

/**
 * 分区函数，将数组分为小于和大于基准元素的两部分
 * 
 * @param {number[]} arr - 数组
 * @param {number} low - 起始索引
 * @param {number} high - 结束索引
 * @returns {number} 基准元素的最终位置
 */
function partition(arr, low, high) {
    // 选择最后一个元素作为基准
    const pivot = arr[high];
    
    // 较小元素的索引
    let i = low - 1;
    
    for (let j = low; j < high; j++) {
        // 如果当前元素小于或等于基准元素
        if (arr[j] <= pivot) {
            i++;
            [arr[i], arr[j]] = [arr[j], arr[i]]; // ES6解构赋值交换元素
        }
    }
    
    // 将基准元素放到正确位置
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
}

/**
 * 测试快速排序算法
 */
function testQuicksort() {
    console.log("=== 快速排序算法测试 ===\n");
    
    // 测试用例
    const testCases = [
        [[64, 34, 25, 12, 22, 11, 90], "普通数组"],
        [[5, 2, 8, 1, 9], "小数组"],
        [[1], "单元素数组"],
        [[], "空数组"],
        [[3, 3, 3, 3], "重复元素数组"],
        [[9, 8, 7, 6, 5, 4, 3, 2, 1], "逆序数组"],
        [[1, 2, 3, 4, 5, 6, 7, 8, 9], "已排序数组"],
        [[-5, -2, 0, 3, 8], "包含负数的数组"]
    ];
    
    testCases.forEach(([arr, description], index) => {
        console.log(`测试 ${index + 1}: ${description}`);
        console.log(`原数组: [${arr.join(', ')}]`);
        
        // 测试非原地排序版本
        const sortedArr = quicksort([...arr]);
        console.log(`快排结果: [${sortedArr.join(', ')}]`);
        
        // 测试原地排序版本
        const inplaceArr = [...arr];
        quicksortInplace(inplaceArr);
        console.log(`原地快排: [${inplaceArr.join(', ')}]`);
        
        // 验证排序是否正确
        const expected = [...arr].sort((a, b) => a - b);
        const isCorrect = JSON.stringify(sortedArr) === JSON.stringify(expected) && 
                         JSON.stringify(inplaceArr) === JSON.stringify(expected);
        console.log(`排序正确: ${isCorrect ? '✓' : '✗'}`);
        console.log("-".repeat(50));
    });
}

/**
 * 性能测试
 */
function performanceTest() {
    console.log("\n=== 性能测试 ===");
    
    // 生成随机数组进行性能测试
    const sizes = [100, 1000, 5000];
    
    sizes.forEach(size => {
        const arr = Array.from({length: size}, () => Math.floor(Math.random() * 1000));
        
        console.log(`\n数组大小: ${size}`);
        
        // 测试非原地快排性能
        let startTime = performance.now();
        quicksort([...arr]);
        let endTime = performance.now();
        console.log(`非原地快排耗时: ${(endTime - startTime).toFixed(4)} 毫秒`);
        
        // 测试原地快排性能
        startTime = performance.now();
        const testArr = [...arr];
        quicksortInplace(testArr);
        endTime = performance.now();
        console.log(`原地快排耗时: ${(endTime - startTime).toFixed(4)} 毫秒`);
        
        // 与JavaScript内置排序比较
        startTime = performance.now();
        [...arr].sort((a, b) => a - b);
        endTime = performance.now();
        console.log(`JavaScript内置排序耗时: ${(endTime - startTime).toFixed(4)} 毫秒`);
    });
}

/**
 * 显示算法复杂度分析
 */
function showComplexityAnalysis() {
    console.log("\n=== 算法复杂度分析 ===");
    console.log("时间复杂度:");
    console.log("- 平均情况: O(n log n)");
    console.log("- 最坏情况: O(n²)");
    console.log("- 最好情况: O(n log n)");
    console.log("\n空间复杂度:");
    console.log("- 非原地版本: O(n)");
    console.log("- 原地版本: O(log n) - 递归调用栈");
}

// ES模块导出
export {
    quicksort,
    quicksortInplace,
    partition,
    testQuicksort,
    performanceTest,
    showComplexityAnalysis
};

// 自动运行测试（如果直接执行该文件）
if (import.meta.url === `file://${process.argv[1]}`) {
    // 运行所有测试
    testQuicksort();
    performanceTest();
    showComplexityAnalysis();
}