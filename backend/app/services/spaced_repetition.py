"""
Spaced Repetition — Thuật toán SM-2 (SuperMemo 2)

SM-2 tính toán khoảng cách ôn tập dựa trên chất lượng trả lời:
- quality 0-2: Quên → reset về đầu
- quality 3:   Khó nhớ → giữ interval ngắn
- quality 4-5: Nhớ tốt → tăng interval

Tham số:
- easiness_factor (EF): Hệ số dễ, tối thiểu 1.3, khởi tạo 2.5
- interval: Số ngày đến lần ôn tiếp theo
- repetitions: Số lần ôn liên tiếp thành công
"""


def calculate_sm2(
    quality: int,
    repetitions: int,
    easiness_factor: float,
    interval: int,
) -> tuple[int, float, int]:
    """
    Tính toán SM-2 algorithm.

    Args:
        quality: Chất lượng trả lời (0-5)
            0 = Hoàn toàn quên
            1 = Sai, nhưng nhận ra khi thấy đáp án
            2 = Sai, nhưng đáp án cảm thấy quen
            3 = Đúng nhưng rất khó nhớ
            4 = Đúng, hơi do dự
            5 = Nhớ hoàn hảo
        repetitions: Số lần ôn liên tiếp thành công hiện tại
        easiness_factor: Hệ số dễ hiện tại (≥ 1.3)
        interval: Khoảng cách ôn hiện tại (ngày)

    Returns:
        (new_repetitions, new_easiness_factor, new_interval)
    """
    # Đảm bảo quality nằm trong khoảng hợp lệ
    quality = max(0, min(5, quality))

    if quality >= 3:
        # Trả lời đúng → tăng interval
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval * easiness_factor)

        new_repetitions = repetitions + 1
    else:
        # Trả lời sai → reset về đầu
        new_repetitions = 0
        new_interval = 1

    # Cập nhật easiness factor theo công thức SM-2
    new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    # EF không được nhỏ hơn 1.3
    new_ef = max(1.3, round(new_ef, 2))

    # Interval tối thiểu là 1 ngày
    new_interval = max(1, new_interval)

    return new_repetitions, new_ef, new_interval
