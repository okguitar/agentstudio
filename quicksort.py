def quicksort(arr):
    """
    快速排序算法实现
    
    Args:
        arr: 待排序的列表
    
    Returns:
        排序后的列表
    """
    if len(arr) <= 1:
        return arr
    
    # 选择基准元素（这里选择中间元素）
    pivot = arr[len(arr) // 2]
    
    # 分区：小于基准的元素、等于基准的元素、大于基准的元素
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    # 递归排序并合并结果
    return quicksort(left) + middle + quicksort(right)


def quicksort_inplace(arr, low=0, high=None):
    """
    原地快速排序算法实现（不创建新数组，空间复杂度更优）
    
    Args:
        arr: 待排序的列表
        low: 起始索引
        high: 结束索引
    """
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        # 分区操作，返回基准元素的正确位置
        pi = partition(arr, low, high)
        
        # 递归排序基准元素左边和右边的子数组
        quicksort_inplace(arr, low, pi - 1)
        quicksort_inplace(arr, pi + 1, high)


def partition(arr, low, high):
    """
    分区函数，将数组分为小于和大于基准元素的两部分
    
    Args:
        arr: 数组
        low: 起始索引
        high: 结束索引
    
    Returns:
        基准元素的最终位置
    """
    # 选择最后一个元素作为基准
    pivot = arr[high]
    
    # 较小元素的索引
    i = low - 1
    
    for j in range(low, high):
        # 如果当前元素小于或等于基准元素
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    # 将基准元素放到正确位置
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


def test_quicksort():
    """测试快速排序算法"""
    print("=== 快速排序算法测试 ===\n")
    
    # 测试用例
    test_cases = [
        ([64, 34, 25, 12, 22, 11, 90], "普通数组"),
        ([5, 2, 8, 1, 9], "小数组"),
        ([1], "单元素数组"),
        ([], "空数组"),
        ([3, 3, 3, 3], "重复元素数组"),
        ([9, 8, 7, 6, 5, 4, 3, 2, 1], "逆序数组"),
        ([1, 2, 3, 4, 5, 6, 7, 8, 9], "已排序数组"),
        ([-5, -2, 0, 3, 8], "包含负数的数组")
    ]
    
    for i, (arr, description) in enumerate(test_cases, 1):
        print(f"测试 {i}: {description}")
        print(f"原数组: {arr}")
        
        # 测试非原地排序版本
        sorted_arr = quicksort(arr.copy())
        print(f"快排结果: {sorted_arr}")
        
        # 测试原地排序版本
        inplace_arr = arr.copy()
        quicksort_inplace(inplace_arr)
        print(f"原地快排: {inplace_arr}")
        
        # 验证排序是否正确
        expected = sorted(arr)
        is_correct = sorted_arr == expected and inplace_arr == expected
        print(f"排序正确: {'✓' if is_correct else '✗'}")
        print("-" * 50)


def performance_test():
    """性能测试"""
    import random
    import time
    
    print("\n=== 性能测试 ===")
    
    # 生成随机数组进行性能测试
    sizes = [100, 1000, 5000]
    
    for size in sizes:
        arr = [random.randint(1, 1000) for _ in range(size)]
        
        print(f"\n数组大小: {size}")
        
        # 测试非原地快排性能
        start_time = time.time()
        quicksort(arr.copy())
        end_time = time.time()
        print(f"非原地快排耗时: {end_time - start_time:.4f} 秒")
        
        # 测试原地快排性能
        start_time = time.time()
        test_arr = arr.copy()
        quicksort_inplace(test_arr)
        end_time = time.time()
        print(f"原地快排耗时: {end_time - start_time:.4f} 秒")
        
        # 与Python内置排序比较
        start_time = time.time()
        sorted(arr)
        end_time = time.time()
        print(f"Python内置排序耗时: {end_time - start_time:.4f} 秒")


if __name__ == "__main__":
    # 运行所有测试
    test_quicksort()
    performance_test()
    
    print("\n=== 算法复杂度分析 ===")
    print("时间复杂度:")
    print("- 平均情况: O(n log n)")
    print("- 最坏情况: O(n²)")
    print("- 最好情况: O(n log n)")
    print("\n空间复杂度:")
    print("- 非原地版本: O(n)")
    print("- 原地版本: O(log n) - 递归调用栈")