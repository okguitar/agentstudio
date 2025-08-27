#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
详细的快速排序演示，包含步骤追踪和可视化
"""

def quicksort_with_trace(arr, level=0, name=""):
    """带有步骤追踪的快速排序"""
    indent = "  " * level
    
    if name:
        print(f"{indent}📍 排序 {name}: {arr}")
    
    if len(arr) <= 1:
        print(f"{indent}✅ 基础情况（长度 <= 1）: 返回 {arr}")
        return arr.copy()
    
    # 选择基准元素
    pivot = arr[len(arr) // 2]
    print(f"{indent}🎯 基准元素: {pivot}")
    
    # 分区
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    print(f"{indent}📊 分区结果:")
    print(f"{indent}   左侧 (< {pivot}): {left}")
    print(f"{indent}   中间 (= {pivot}): {middle}")
    print(f"{indent}   右侧 (> {pivot}): {right}")
    
    # 递归排序
    if left:
        print(f"{indent}⬅️  递归排序左侧")
        left_sorted = quicksort_with_trace(left, level + 1, "左侧")
    else:
        left_sorted = []
    
    if right:
        print(f"{indent}➡️  递归排序右侧")
        right_sorted = quicksort_with_trace(right, level + 1, "右侧")
    else:
        right_sorted = []
    
    # 合并结果
    result = left_sorted + middle + right_sorted
    print(f"{indent}🔗 合并结果: {result}")
    
    return result


def demonstrate_quicksort():
    """演示快速排序的详细过程"""
    print("🚀 快速排序详细过程演示")
    print("=" * 60)
    
    test_arrays = [
        [64, 34, 25, 12, 22, 11, 90],
        [3, 6, 8, 10, 1, 2, 1],
        [5, 2, 4, 6, 1, 3]
    ]
    
    for i, arr in enumerate(test_arrays, 1):
        print(f"\n📋 示例 {i}:")
        print(f"原始数组: {arr}")
        print("-" * 40)
        
        result = quicksort_with_trace(arr.copy())
        
        print(f"\n✨ 最终结果: {result}")
        print(f"排序正确: {'✅' if result == sorted(arr) else '❌'}")
        print("=" * 60)


def interactive_quicksort():
    """交互式快速排序演示"""
    print("\n🎯 交互式快速排序")
    print("=" * 40)
    
    while True:
        try:
            user_input = input("\n请输入数字数组（空格分隔，或输入'quit'退出）: ").strip()
            
            if user_input.lower() in ['quit', 'q', '退出']:
                print("👋 退出演示")
                break
            
            if not user_input:
                print("❌ 请输入数字")
                continue
            
            # 解析输入
            numbers = list(map(int, user_input.split()))
            
            print(f"\n📊 输入的数组: {numbers}")
            print("-" * 30)
            
            # 运行详细的快速排序
            result = quicksort_with_trace(numbers)
            
            print(f"\n🎉 排序完成！")
            print(f"原数组: {numbers}")
            print(f"结果:   {result}")
            
            # 验证正确性
            expected = sorted(numbers)
            if result == expected:
                print("✅ 排序正确！")
            else:
                print(f"❌ 排序错误！期望: {expected}")
            
        except ValueError:
            print("❌ 请输入有效的数字（空格分隔）")
        except KeyboardInterrupt:
            print("\n\n👋 程序被用户中断")
            break
        except Exception as e:
            print(f"❌ 发生错误: {e}")


def compare_algorithms():
    """比较不同排序算法的性能"""
    import time
    import random
    
    print("\n⚡ 排序算法性能对比")
    print("=" * 50)
    
    def bubble_sort(arr):
        """冒泡排序（用于对比）"""
        n = len(arr)
        for i in range(n):
            for j in range(0, n - i - 1):
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
        return arr
    
    def quicksort_simple(arr):
        """简单快速排序"""
        if len(arr) <= 1:
            return arr
        pivot = arr[len(arr) // 2]
        left = [x for x in arr if x < pivot]
        middle = [x for x in arr if x == pivot]
        right = [x for x in arr if x > pivot]
        return quicksort_simple(left) + middle + quicksort_simple(right)
    
    # 测试不同大小的数组
    sizes = [100, 500, 1000]
    
    for size in sizes:
        print(f"\n📏 数组大小: {size}")
        test_data = [random.randint(1, 100) for _ in range(size)]
        
        algorithms = [
            ("快速排序", quicksort_simple),
            ("冒泡排序", bubble_sort),
            ("Python内置", sorted)
        ]
        
        for name, algorithm in algorithms:
            data_copy = test_data.copy()
            
            start_time = time.time()
            if name == "Python内置":
                result = algorithm(data_copy)
            else:
                result = algorithm(data_copy)
            end_time = time.time()
            
            elapsed = end_time - start_time
            print(f"  {name:12s}: {elapsed:.6f} 秒")


if __name__ == "__main__":
    # 运行所有演示
    demonstrate_quicksort()
    
    # 交互式演示
    interactive_quicksort()
    
    # 性能对比
    compare_algorithms()