#!/usr/bin/env python3
"""Apply the maintainability/i18n pass after the monolith has been extracted."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


TRANSLATIONS = {
    "en": {
        "软西瓜 · 果冻工坊 · 挑战版": "Melt Melon · Jelly Workshop · Challenge Edition",
        "软西瓜": "Melt Melon", "挑战版": "Challenge", "游戏设置": "Game settings",
        "打开慢镜头": "Open slow motion", "关闭慢镜头": "Close slow motion", "慢镜头": "Slow motion",
        "怎么玩": "How to play", "玩法": "Guide", "开启声音": "Enable sound", "关闭声音": "Mute sound", "声音": "Sound",
        "暂停游戏": "Pause game", "继续游戏": "Resume game", "暂停 · P": "Pause · P", "暂停": "Pause", "继续": "Resume",
        "一小池，软乎乎": "A tiny pool, soft and squishy", "揉一揉，": "Give it a squeeze,", "合个大西瓜": "merge a giant melon",
        "相同水果合在一起。": "Merge matching fruit.", "太挤了，就让它们软一点。": "If it gets crowded, soften them a little.",
        "今天，合到这颗！": "Today's goal: this one!", "留点空隙，也留点好运。": "Leave some space — and a little luck.",
        "软西瓜游戏": "Melt Melon game", "这一局": "This round", "最高纪录": "Best score", "下一颗": "Next",
        "下一颗水果": "Next fruit", "水果投放区。拖动瞄准，松手投放。左右方向键瞄准，回车投放，空格揉软，A D 倾斜，P 暂停。": "Fruit drop area. Drag to aim and release to drop. Use Left/Right to aim, Enter to drop, Space to soften, A/D to tilt, and P to pause.",
        "图片准备中…": "Loading artwork…", "图片准备中": "Loading artwork", "歇一会儿": "Take a break", "果冻等你回来。": "The jelly will wait for you.",
        "继续合成": "Keep merging", "快满了，给水果腾点地方": "Almost full — make some room", "左右移动，松手放下第一颗。": "Move left or right, then release the first fruit.",
        "跳过教学": "Skip tutorial", "接下来": "Up next", "先看看下一颗，": "Check the next fruit,", "给它留个位置。": "and save it a spot.",
        "倾斜与软化控制": "Tilt and soften controls", "按住向左倾斜，每秒消耗10能量": "Hold to tilt left; costs 10 energy per second", "左倾": "Tilt left",
        "10/秒": "10/sec", "揉软水果，消耗60能量": "Soften fruit; costs 60 energy", "揉软一下": "Soften", "挤进空隙 · 消耗 60": "Squeeze through gaps · Cost 60",
        "按住向右倾斜，每秒消耗10能量": "Hold to tilt right; costs 10 energy per second", "右倾": "Tilt right", "果汁能量": "Juice energy", "合成 +2": "Merge +2",
        "拖出果池再松手，可取消投放": "Drag outside the pool before releasing to cancel", "重新开始 ↻": "Restart ↻", "重新开始": "Restart",
        "一个小窍门": "Quick tip", "小水果卡住时，": "When a small fruit gets stuck,", "试试": "try", "揉软": "softening", "看看怎么挤过去": "See how to squeeze through",
        "瞄准": "Aim", "投放": "Drop", "倾斜": "Tilt", "水果合成顺序": "Fruit merge order", "从小蓝莓": "From blueberry", "到大西瓜": "to watermelon",
        "两颗相同水果，合成下一颗。": "Two matching fruits merge into the next one.", "慢慢来，软着玩。": "Take it easy. Keep it squishy.", "减少动态效果": "Reduce motion", "恢复完整动态": "Restore full motion",
        "关闭玩法说明": "Close instructions", "一点点上手": "Learn the basics", "给水果找个好位置。": "Find a good spot for each fruit.", "松手投放": "Release to drop",
        "左右拖动瞄准，松手放下。拖出果池再松手，就能取消。": "Drag left or right to aim, then release. Drag outside the pool before releasing to cancel.",
        "相同的会合成": "Matching fruit merge", "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "Two matching fruits become the next fruit. There are 11 levels; the next fruit is randomly chosen from the first five. Chain merges for a higher score.",
        "挤不动，揉软一下": "Stuck? Soften it", "点“揉软一下”，水果会软化 2.4 秒，消耗 60 能量。每次合成补充 2 能量。倾斜每秒消耗 10 能量，和揉软共用。": "Tap “Soften” to soften fruit for 2.4 seconds at a cost of 60 energy. Each merge restores 2 energy. Tilting costs 10 energy per second and shares the same meter.",
        "别越过红线": "Stay below the red line", "水果稳定越过红线 3 秒，本局结束。西瓜不会消除，合出后可以继续冲分。": "If fruit stays above the red line for 3 seconds, the round ends. Watermelons remain in the pool, so you can keep scoring after making one.",
        "练一次揉软": "Practice softening", "回到游戏": "Back to game", "跳过软化练习": "Skip softening practice", "亲手试一下 · 练习不影响当前对局": "Try it yourself · Practice does not affect the current round",
        "差一点，就能碰到伙伴。": "So close to its partner.", "点一下揉软，让上面的果肉挤过缝隙。": "Tap soften so the upper fruit can squeeze through the gap.",
        "软化练习：一颗猕猴桃被卡在缝隙上方，下方还有一颗猕猴桃。": "Softening practice: one kiwi is stuck above a gap, with another kiwi below.",
        "揉软看看": "Try softening", "学会了，继续合成": "Got it — keep merging", "再试一次": "Try again", "新的一局": "New round", "换一池新水果？": "Start with a fresh pool?",
        "这一局会重新开始，最高纪录会保留。": "This round will restart. Your best score will be kept.", "接着玩": "Keep playing", "这一池，收获满满": "A pool full of fruit", "又离大西瓜近了一点。": "One step closer to the big watermelon.",
        "再来一局": "Play again", "继续挑战": "Keep going", "把一瞬间，放慢一点": "Slow down the moment", "同一套水果运动，放慢看压缩与回弹。": "Watch the same fruit motion in slow motion to see compression and rebound.",
        "选择动作场景": "Choose a motion scene", "单果落地": "Single-fruit drop", "大小碰撞": "Large/small collision", "同果合成": "Matching-fruit merge", "模拟时刻": "Simulation time",
        "水果慢镜头。可开启显示真实节点。": "Fruit slow motion. You can show the real soft-body nodes.", "拖动时间轴": "Scrub timeline", "慢镜头时间轴，单位秒": "Slow-motion timeline in seconds",
        "慢镜头播放控制": "Slow-motion playback controls", "播放速度": "Playback speed", "正常速度": "Normal speed", "四分之一速度": "Quarter speed", "前进 1/60 秒模拟时间": "Advance 1/60 second of simulation time",
        "+1 帧": "+1 frame", "重来": "Reset", "显示真实节点": "Show real nodes", "还未接触": "No contact yet", "宽高单位为逻辑像素。+1 帧前进 1/60 秒。": "Width and height use logical pixels. +1 frame advances 1/60 second.",
        "验证记录": "QA tools", "40 果实压力场景": "40-fruit stress scene", "大水果气泡外膜": "Large-fruit bubble shell", "连续中间投放": "Continuous center drops", "查看结束画面": "Show game-over screen", "查看西瓜画面": "Show watermelon screen",
        "蓝莓": "Blueberry", "葡萄": "Grape", "樱桃": "Cherry", "橙子": "Orange", "柠檬": "Lemon", "苹果": "Apple", "猕猴桃": "Kiwi", "蜜桃": "Peach", "椰子": "Coconut", "哈密瓜": "Cantaloupe", "西瓜": "Watermelon",
        "新的一局，先看看已有水果的位置。": "New round — check where the existing fruit are first.", "左右移动，给第一颗水果选个落点。": "Move left or right and choose a landing spot for the first fruit.",
        "再放一颗也可以，相同水果碰到一起就会合成。": "Drop another one. Matching fruit merge when they touch.", "合成了！接着，亲手试一次揉软。": "Merged! Next, try softening one yourself.", "先看下一颗，再给它留个位置。": "Check the next fruit and save it a spot.",
        "软乎乎地挤过去…": "Squeezing through softly…", "体积没消失，只是换了个形状。": "The volume is still there — only the shape changed.", "挤过去，合在一起了。": "It squeezed through and merged.", "下次小水果卡住时，就用这一招。": "Use this trick next time a small fruit gets stuck.",
        "练习完成。揉软让水果穿过缝隙，并合成了蜜桃。": "Practice complete. Softening let the fruit pass through the gap and merge into a peach.", "这颗大西瓜，属于你": "This big watermelon is yours", "达到自己的最高纪录": "A new personal best", "合出来了！": "You made it!", "果池装满啦。": "The fruit pool is full.",
        "还可以继续冲分。西瓜会留在果池里，不会消除。": "You can keep scoring. Watermelons stay in the pool and do not disappear.", "水果开始揉软，持续2.4秒。": "The fruit is softening for 2.4 seconds.", "合成了！继续放，卡住时试试揉软。": "Merged! Keep dropping; try softening when fruit gets stuck.",
        "水果图片未能载入，请重新打开文件。": "Fruit artwork could not be loaded. Please reopen the page.", "松手放下 · 拖出果池可取消": "Release to drop · Drag outside to cancel", "已移出果池，松手会取消": "Outside the pool · Release to cancel",
        "左右移动 · 松手放下第一颗": "Move left/right · Release the first fruit", "左右移动 · 松手投放": "Move left/right · Release to drop", "软乎乎的…": "Soft and squishy…", "再攒一点能量": "Build a little more energy",
        "两颗猕猴桃，被挡板隔开了。": "Two kiwis are separated by the bumpers.", "缝隙太窄了。点一下软化，让果肉挤过去。": "The gap is too narrow. Soften the fruit so it can squeeze through.", "果肉变软了，正在挤过缝隙。": "The fruit is soft and squeezing through the gap.", "果肉正在恢复弹性。": "The fruit is regaining its springiness.", "挤过去了！同样的水果碰到一起，就会合成。": "It made it through! Matching fruit merge when they touch.", "有点窄": "A bit tight",
        "看下落加速、触地压缩，以及回弹后的余振。": "Watch the fall accelerate, compress on impact, then wobble after the rebound.", "看小水果接触大水果时，两边的轮廓怎样变化。": "Watch how both outlines change when a small fruit hits a large one.", "看两颗相同水果接触后，怎样变成新水果。": "Watch two matching fruits become a new fruit after contact.",
        "留点空隙": "Leave some space", "首次接触 {time} s · 速度 {speed} px/s": "First contact {time} s · Speed {speed} px/s", "接触蓄力 {time} s": "Contact buildup {time} s", "完成合成 {time} s · 产生新水果": "Merge complete {time} s · New fruit created",
        "果 {id}": "Fruit {id}", "果 {id} · 宽 {width} / 高 {height} · W/H {ratio}": "Fruit {id} · W {width} / H {height} · W/H {ratio}", "软乎乎的 · 还剩 {seconds} 秒": "Soft · {seconds}s left", "连续合成 {count} 次": "Merge combo ×{count}", "还有 {seconds} 秒": "{seconds}s left", "挤进空隙 · 消耗 {cost}": "Squeeze through gaps · Cost {cost}", "再合成 {count} 次就能用": "Merge {count} more time(s) to use", "下一颗水果：{fruit}": "Next fruit: {fruit}", "合成{fruit}，获得{points}分。": "Merged {fruit} for {points} points.", "这一局合成了 {count} 次。下次试着把大水果放在一侧，别把小水果埋在底下。": "You made {count} merges this round. Next time, keep large fruit to one side so small fruit do not get buried."
    },
    "vi": {
        "软西瓜 · 果冻工坊 · 挑战版": "Dưa Hấu Mềm · Xưởng Thạch · Thử Thách",
        "软西瓜": "Dưa Hấu Mềm", "挑战版": "Thử thách", "游戏设置": "Cài đặt trò chơi",
        "打开慢镜头": "Mở quay chậm", "关闭慢镜头": "Đóng quay chậm", "慢镜头": "Quay chậm", "怎么玩": "Cách chơi", "玩法": "Hướng dẫn", "开启声音": "Bật âm thanh", "关闭声音": "Tắt âm thanh", "声音": "Âm thanh",
        "暂停游戏": "Tạm dừng", "继续游戏": "Tiếp tục", "暂停 · P": "Tạm dừng · P", "暂停": "Tạm dừng", "继续": "Tiếp tục",
        "一小池，软乎乎": "Một hồ nhỏ, mềm dẻo", "揉一揉，": "Bóp mềm một chút,", "合个大西瓜": "ghép thành dưa hấu lớn", "相同水果合在一起。": "Ghép hai quả giống nhau.", "太挤了，就让它们软一点。": "Chật quá thì làm chúng mềm hơn một chút.",
        "今天，合到这颗！": "Mục tiêu hôm nay: quả này!", "留点空隙，也留点好运。": "Chừa chút khoảng trống, chừa luôn chút may mắn.", "软西瓜游戏": "Trò chơi Dưa Hấu Mềm", "这一局": "Ván này", "最高纪录": "Kỷ lục", "下一颗": "Tiếp theo", "下一颗水果": "Trái tiếp theo",
        "水果投放区。拖动瞄准，松手投放。左右方向键瞄准，回车投放，空格揉软，A D 倾斜，P 暂停。": "Khu thả trái cây. Kéo để ngắm và thả tay để rơi. Dùng ←/→ để ngắm, Enter để thả, Space để làm mềm, A/D để nghiêng và P để tạm dừng.",
        "图片准备中…": "Đang tải hình…", "图片准备中": "Đang tải hình", "歇一会儿": "Nghỉ một chút", "果冻等你回来。": "Thạch sẽ chờ bạn quay lại.", "继续合成": "Tiếp tục ghép", "快满了，给水果腾点地方": "Sắp đầy rồi — hãy tạo thêm chỗ", "左右移动，松手放下第一颗。": "Di chuyển trái/phải rồi thả quả đầu tiên.", "跳过教学": "Bỏ qua hướng dẫn",
        "接下来": "Sắp tới", "先看看下一颗，": "Xem trái tiếp theo,", "给它留个位置。": "rồi chừa chỗ cho nó.", "倾斜与软化控制": "Điều khiển nghiêng và làm mềm", "按住向左倾斜，每秒消耗10能量": "Giữ để nghiêng trái, tốn 10 năng lượng/giây", "左倾": "Nghiêng trái", "10/秒": "10/giây",
        "揉软水果，消耗60能量": "Làm mềm trái cây, tốn 60 năng lượng", "揉软一下": "Làm mềm", "挤进空隙 · 消耗 60": "Len qua khe · Tốn 60", "按住向右倾斜，每秒消耗10能量": "Giữ để nghiêng phải, tốn 10 năng lượng/giây", "右倾": "Nghiêng phải", "果汁能量": "Năng lượng nước quả", "合成 +2": "Ghép +2",
        "拖出果池再松手，可取消投放": "Kéo ra ngoài hồ rồi thả để hủy", "重新开始 ↻": "Chơi lại ↻", "重新开始": "Chơi lại", "一个小窍门": "Mẹo nhỏ", "小水果卡住时，": "Khi trái nhỏ bị kẹt,", "试试": "hãy thử", "揉软": "làm mềm", "看看怎么挤过去": "Xem cách len qua khe", "瞄准": "Ngắm", "投放": "Thả", "倾斜": "Nghiêng",
        "水果合成顺序": "Thứ tự ghép trái", "从小蓝莓": "Từ việt quất", "到大西瓜": "đến dưa hấu", "两颗相同水果，合成下一颗。": "Hai trái giống nhau sẽ ghép thành trái cấp kế tiếp.", "慢慢来，软着玩。": "Cứ từ từ, chơi thật mềm.", "减少动态效果": "Giảm chuyển động", "恢复完整动态": "Khôi phục chuyển động đầy đủ",
        "关闭玩法说明": "Đóng hướng dẫn", "一点点上手": "Làm quen từng bước", "给水果找个好位置。": "Chọn vị trí tốt cho từng trái.", "松手投放": "Thả tay để rơi", "左右拖动瞄准，松手放下。拖出果池再松手，就能取消。": "Kéo trái/phải để ngắm rồi thả tay. Kéo ra ngoài hồ trước khi thả để hủy.", "相同的会合成": "Trái giống nhau sẽ ghép",
        "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "Hai trái giống nhau chạm nhau sẽ thành trái cấp kế tiếp. Có 11 cấp; trái tiếp theo được chọn ngẫu nhiên trong 5 cấp đầu. Ghép liên tiếp sẽ được nhiều điểm hơn.", "挤不动，揉软一下": "Bị kẹt? Hãy làm mềm", "点“揉软一下”，水果会软化 2.4 秒，消耗 60 能量。每次合成补充 2 能量。倾斜每秒消耗 10 能量，和揉软共用。": "Nhấn “Làm mềm” để làm mềm trái trong 2,4 giây, tốn 60 năng lượng. Mỗi lần ghép hồi 2 năng lượng. Nghiêng tốn 10 năng lượng/giây và dùng chung thanh năng lượng.",
        "别越过红线": "Đừng vượt vạch đỏ", "水果稳定越过红线 3 秒，本局结束。西瓜不会消除，合出后可以继续冲分。": "Nếu trái nằm ổn định trên vạch đỏ trong 3 giây, ván chơi kết thúc. Dưa hấu không biến mất nên bạn vẫn có thể tiếp tục ghi điểm sau khi ghép được.", "练一次揉软": "Thử làm mềm", "回到游戏": "Quay lại trò chơi", "跳过软化练习": "Bỏ qua bài tập làm mềm", "亲手试一下 · 练习不影响当前对局": "Tự thử · Bài tập không ảnh hưởng ván hiện tại",
        "差一点，就能碰到伙伴。": "Chỉ còn một chút là chạm được bạn cùng loại.", "点一下揉软，让上面的果肉挤过缝隙。": "Nhấn làm mềm để trái phía trên len qua khe.", "软化练习：一颗猕猴桃被卡在缝隙上方，下方还有一颗猕猴桃。": "Bài tập làm mềm: một quả kiwi mắc trên khe và một quả kiwi khác ở dưới.", "揉软看看": "Thử làm mềm", "学会了，继续合成": "Hiểu rồi — tiếp tục ghép", "再试一次": "Thử lại",
        "新的一局": "Ván mới", "换一池新水果？": "Đổi sang một hồ trái cây mới?", "这一局会重新开始，最高纪录会保留。": "Ván hiện tại sẽ bắt đầu lại, kỷ lục vẫn được giữ.", "接着玩": "Chơi tiếp", "这一池，收获满满": "Một hồ đầy thành quả", "又离大西瓜近了一点。": "Lại gần dưa hấu lớn thêm một bước.", "再来一局": "Chơi ván nữa", "继续挑战": "Tiếp tục thử thách",
        "把一瞬间，放慢一点": "Làm chậm khoảnh khắc", "同一套水果运动，放慢看压缩与回弹。": "Xem cùng chuyển động ở tốc độ chậm để quan sát nén và nảy.", "选择动作场景": "Chọn cảnh chuyển động", "单果落地": "Một trái rơi", "大小碰撞": "Va chạm lớn/nhỏ", "同果合成": "Ghép trái giống nhau", "模拟时刻": "Thời gian mô phỏng", "水果慢镜头。可开启显示真实节点。": "Chuyển động chậm của trái cây. Có thể bật hiển thị các nút vật lý thật.", "拖动时间轴": "Kéo dòng thời gian", "慢镜头时间轴，单位秒": "Dòng thời gian quay chậm, đơn vị giây", "慢镜头播放控制": "Điều khiển phát quay chậm", "播放速度": "Tốc độ phát", "正常速度": "Tốc độ thường", "四分之一速度": "Tốc độ 1/4", "前进 1/60 秒模拟时间": "Tiến 1/60 giây mô phỏng", "+1 帧": "+1 khung hình", "重来": "Đặt lại", "显示真实节点": "Hiện nút vật lý thật", "还未接触": "Chưa va chạm", "宽高单位为逻辑像素。+1 帧前进 1/60 秒。": "Chiều rộng/cao dùng pixel logic. +1 khung hình tiến 1/60 giây.",
        "验证记录": "Công cụ QA", "40 果实压力场景": "Cảnh tải 40 trái", "大水果气泡外膜": "Lớp màng bọt của trái lớn", "连续中间投放": "Thả liên tục ở giữa", "查看结束画面": "Xem màn hình kết thúc", "查看西瓜画面": "Xem màn hình dưa hấu",
        "蓝莓": "Việt quất", "葡萄": "Nho", "樱桃": "Anh đào", "橙子": "Cam", "柠檬": "Chanh", "苹果": "Táo", "猕猴桃": "Kiwi", "蜜桃": "Đào", "椰子": "Dừa", "哈密瓜": "Dưa lưới", "西瓜": "Dưa hấu",
        "新的一局，先看看已有水果的位置。": "Ván mới — hãy xem vị trí các trái hiện có trước.", "左右移动，给第一颗水果选个落点。": "Di chuyển trái/phải và chọn điểm rơi cho trái đầu tiên.", "再放一颗也可以，相同水果碰到一起就会合成。": "Thả thêm một trái; hai trái giống nhau sẽ ghép khi chạm nhau.", "合成了！接着，亲手试一次揉软。": "Ghép thành công! Tiếp theo hãy tự thử làm mềm một lần.", "先看下一颗，再给它留个位置。": "Xem trái tiếp theo rồi chừa vị trí cho nó.", "软乎乎地挤过去…": "Đang mềm ra và len qua…", "体积没消失，只是换了个形状。": "Thể tích không mất đi, chỉ đổi hình dạng.", "挤过去，合在一起了。": "Đã len qua và ghép lại.", "下次小水果卡住时，就用这一招。": "Lần tới trái nhỏ bị kẹt, hãy dùng cách này.", "练习完成。揉软让水果穿过缝隙，并合成了蜜桃。": "Hoàn thành bài tập. Làm mềm giúp trái đi qua khe và ghép thành quả đào.",
        "这颗大西瓜，属于你": "Quả dưa hấu lớn này là của bạn", "达到自己的最高纪录": "Kỷ lục cá nhân mới", "合出来了！": "Ghép được rồi!", "果池装满啦。": "Hồ trái cây đầy rồi.", "还可以继续冲分。西瓜会留在果池里，不会消除。": "Bạn vẫn có thể tiếp tục ghi điểm. Dưa hấu ở lại trong hồ và không biến mất.", "水果开始揉软，持续2.4秒。": "Trái bắt đầu mềm trong 2,4 giây.", "合成了！继续放，卡住时试试揉软。": "Ghép thành công! Tiếp tục thả; khi bị kẹt hãy thử làm mềm.",
        "水果图片未能载入，请重新打开文件。": "Không tải được hình trái cây. Hãy mở lại trang.", "松手放下 · 拖出果池可取消": "Thả tay để rơi · Kéo ra ngoài để hủy", "已移出果池，松手会取消": "Đã ra ngoài hồ · Thả tay để hủy", "左右移动 · 松手放下第一颗": "Trái/phải · Thả trái đầu tiên", "左右移动 · 松手投放": "Trái/phải · Thả để rơi", "软乎乎的…": "Đang mềm…", "再攒一点能量": "Tích thêm năng lượng",
        "两颗猕猴桃，被挡板隔开了。": "Hai quả kiwi đang bị tấm chắn ngăn cách.", "缝隙太窄了。点一下软化，让果肉挤过去。": "Khe quá hẹp. Nhấn làm mềm để trái len qua.", "果肉变软了，正在挤过缝隙。": "Trái đã mềm và đang len qua khe.", "果肉正在恢复弹性。": "Trái đang lấy lại độ đàn hồi.", "挤过去了！同样的水果碰到一起，就会合成。": "Đã len qua! Hai trái giống nhau sẽ ghép khi chạm nhau.", "有点窄": "Hơi chật",
        "看下落加速、触地压缩，以及回弹后的余振。": "Quan sát tăng tốc khi rơi, nén lúc chạm đất và dao động sau khi nảy.", "看小水果接触大水果时，两边的轮廓怎样变化。": "Quan sát đường viền hai bên thay đổi khi trái nhỏ chạm trái lớn.", "看两颗相同水果接触后，怎样变成新水果。": "Quan sát hai trái giống nhau biến thành trái mới sau khi chạm.",
        "留点空隙": "Chừa khoảng trống", "首次接触 {time} s · 速度 {speed} px/s": "Chạm lần đầu {time} s · Tốc độ {speed} px/s", "接触蓄力 {time} s": "Tích lực tiếp xúc {time} s", "完成合成 {time} s · 产生新水果": "Ghép xong {time} s · Tạo trái mới", "果 {id}": "Trái {id}", "果 {id} · 宽 {width} / 高 {height} · W/H {ratio}": "Trái {id} · Rộng {width} / Cao {height} · W/H {ratio}", "软乎乎的 · 还剩 {seconds} 秒": "Đang mềm · Còn {seconds} giây", "连续合成 {count} 次": "Combo ghép ×{count}", "还有 {seconds} 秒": "Còn {seconds} giây", "挤进空隙 · 消耗 {cost}": "Len qua khe · Tốn {cost}", "再合成 {count} 次就能用": "Ghép thêm {count} lần để dùng", "下一颗水果：{fruit}": "Trái tiếp theo: {fruit}", "合成{fruit}，获得{points}分。": "Ghép {fruit}, nhận {points} điểm.", "这一局合成了 {count} 次。下次试着把大水果放在一侧，别把小水果埋在底下。": "Ván này bạn ghép {count} lần. Lần sau hãy để trái lớn sang một bên để trái nhỏ không bị chôn ở đáy."
    },
    "ja": {
        "软西瓜 · 果冻工坊 · 挑战版": "やわらかスイカ · ゼリー工房 · チャレンジ版", "软西瓜": "やわらかスイカ", "挑战版": "チャレンジ", "游戏设置": "ゲーム設定", "打开慢镜头": "スローモーションを開く", "关闭慢镜头": "スローモーションを閉じる", "慢镜头": "スローモーション", "怎么玩": "遊び方", "玩法": "遊び方", "开启声音": "サウンドをオン", "关闭声音": "サウンドをオフ", "声音": "サウンド", "暂停游戏": "一時停止", "继续游戏": "再開", "暂停 · P": "一時停止 · P", "暂停": "一時停止", "继续": "再開",
        "一小池，软乎乎": "小さなプール、ぷるぷる", "揉一揉，": "やわらかくして、", "合个大西瓜": "大きなスイカを作ろう", "相同水果合在一起。": "同じフルーツをくっつけよう。", "太挤了，就让它们软一点。": "混んできたら少しやわらかく。", "今天，合到这颗！": "今日の目標はこれ！", "留点空隙，也留点好运。": "すき間と運を少し残そう。", "软西瓜游戏": "やわらかスイカゲーム", "这一局": "今回", "最高纪录": "ベスト", "下一颗": "次", "下一颗水果": "次のフルーツ",
        "水果投放区。拖动瞄准，松手投放。左右方向键瞄准，回车投放，空格揉软，A D 倾斜，P 暂停。": "フルーツ投下エリア。ドラッグで狙い、離して投下。左右キーで照準、Enterで投下、Spaceでやわらかく、A/Dで傾け、Pで一時停止。", "图片准备中…": "画像を読み込み中…", "图片准备中": "画像を読み込み中", "歇一会儿": "ひと休み", "果冻等你回来。": "ゼリーは戻ってくるのを待っています。", "继续合成": "合成を続ける", "快满了，给水果腾点地方": "もうすぐ満杯 — 場所を空けよう", "左右移动，松手放下第一颗。": "左右に動かして、最初のフルーツを離して落とそう。", "跳过教学": "チュートリアルをスキップ",
        "接下来": "次はこちら", "先看看下一颗，": "次のフルーツを見て、", "给它留个位置。": "場所を残しておこう。", "倾斜与软化控制": "傾き・やわらか操作", "按住向左倾斜，每秒消耗10能量": "押して左に傾ける（毎秒10エネルギー）", "左倾": "左へ", "10/秒": "10/秒", "揉软水果，消耗60能量": "フルーツをやわらかくする（60エネルギー）", "揉软一下": "やわらかく", "挤进空隙 · 消耗 60": "すき間に入る · 60消費", "按住向右倾斜，每秒消耗10能量": "押して右に傾ける（毎秒10エネルギー）", "右倾": "右へ", "果汁能量": "ジュースエネルギー", "合成 +2": "合成 +2", "拖出果池再松手，可取消投放": "プール外へドラッグして離すとキャンセル", "重新开始 ↻": "やり直す ↻", "重新开始": "やり直す",
        "一个小窍门": "ちょっとしたコツ", "小水果卡住时，": "小さいフルーツが詰まったら、", "试试": "試してみよう", "揉软": "やわらかく", "看看怎么挤过去": "すき間を通る方法を見る", "瞄准": "狙う", "投放": "落とす", "倾斜": "傾ける", "水果合成顺序": "フルーツ合成順", "从小蓝莓": "ブルーベリーから", "到大西瓜": "スイカまで", "两颗相同水果，合成下一颗。": "同じフルーツ2個で次のフルーツへ。", "慢慢来，软着玩。": "ゆっくり、やわらかく遊ぼう。", "减少动态效果": "動きを減らす", "恢复完整动态": "動きを元に戻す",
        "关闭玩法说明": "説明を閉じる", "一点点上手": "少しずつ覚える", "给水果找个好位置。": "フルーツに良い場所を見つけよう。", "松手投放": "離して投下", "左右拖动瞄准，松手放下。拖出果池再松手，就能取消。": "左右にドラッグして狙い、離して落とします。プール外へドラッグして離すとキャンセルできます。", "相同的会合成": "同じものは合成", "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "同じフルーツ同士が触れると次の種類になります。全11段階で、次のフルーツは最初の5段階からランダム。連続合成で高得点。", "挤不动，揉软一下": "詰まったらやわらかく", "点“揉软一下”，水果会软化 2.4 秒，消耗 60 能量。每次合成补充 2 能量。倾斜每秒消耗 10 能量，和揉软共用。": "「やわらかく」を押すと2.4秒やわらかくなり、60エネルギーを消費。合成ごとに2回復し、傾きは毎秒10消費します。", "别越过红线": "赤い線を越えないで", "水果稳定越过红线 3 秒，本局结束。西瓜不会消除，合出后可以继续冲分。": "フルーツが赤い線の上に3秒とどまると終了。スイカは消えないので、作った後もスコアを伸ばせます。", "练一次揉软": "やわらか練習", "回到游戏": "ゲームへ戻る", "跳过软化练习": "練習をスキップ", "亲手试一下 · 练习不影响当前对局": "自分で試す · 練習は現在のゲームに影響しません", "差一点，就能碰到伙伴。": "あと少しで仲間に届く。", "点一下揉软，让上面的果肉挤过缝隙。": "やわらかくして、上のフルーツをすき間へ通そう。", "软化练习：一颗猕猴桃被卡在缝隙上方，下方还有一颗猕猴桃。": "やわらか練習：キウイがすき間の上で詰まり、下にもキウイがあります。", "揉软看看": "やわらかくする", "学会了，继续合成": "できた — 合成を続ける", "再试一次": "もう一度", "新的一局": "新しいゲーム", "换一池新水果？": "新しいフルーツプールにする？", "这一局会重新开始，最高纪录会保留。": "現在のゲームをやり直します。ベストスコアは残ります。", "接着玩": "続ける", "这一池，收获满满": "実りいっぱい", "又离大西瓜近了一点。": "大きなスイカにまた一歩近づいた。", "再来一局": "もう一回", "继续挑战": "続けて挑戦",
        "把一瞬间，放慢一点": "その瞬間をゆっくり", "同一套水果运动，放慢看压缩与回弹。": "同じ動きをゆっくり再生し、圧縮と反発を観察します。", "选择动作场景": "シーンを選ぶ", "单果落地": "単体落下", "大小碰撞": "大小衝突", "同果合成": "同種合成", "模拟时刻": "シミュレーション時刻", "水果慢镜头。可开启显示真实节点。": "フルーツのスローモーション。実ノード表示も可能です。", "拖动时间轴": "タイムラインを動かす", "慢镜头时间轴，单位秒": "スローモーションのタイムライン（秒）", "慢镜头播放控制": "再生コントロール", "播放速度": "再生速度", "正常速度": "通常速度", "四分之一速度": "1/4速度", "前进 1/60 秒模拟时间": "シミュレーションを1/60秒進める", "+1 帧": "+1フレーム", "重来": "リセット", "显示真实节点": "実ノードを表示", "还未接触": "まだ接触なし", "宽高单位为逻辑像素。+1 帧前进 1/60 秒。": "幅と高さは論理ピクセル。+1フレームで1/60秒進みます。", "验证记录": "QAツール", "40 果实压力场景": "40フルーツ負荷", "大水果气泡外膜": "大型フルーツの膜", "连续中间投放": "中央へ連続投下", "查看结束画面": "ゲームオーバー画面", "查看西瓜画面": "スイカ画面",
        "蓝莓": "ブルーベリー", "葡萄": "ブドウ", "樱桃": "サクランボ", "橙子": "オレンジ", "柠檬": "レモン", "苹果": "リンゴ", "猕猴桃": "キウイ", "蜜桃": "モモ", "椰子": "ココナッツ", "哈密瓜": "メロン", "西瓜": "スイカ",
        "新的一局，先看看已有水果的位置。": "新しいゲーム。まず今あるフルーツの位置を見よう。", "左右移动，给第一颗水果选个落点。": "左右に動かして最初のフルーツの落下位置を決めよう。", "再放一颗也可以，相同水果碰到一起就会合成。": "もう1個落としてみよう。同じフルーツは触れると合成します。", "合成了！接着，亲手试一次揉软。": "合成成功！次は自分でやわらかくしてみよう。", "先看下一颗，再给它留个位置。": "次のフルーツを見て場所を残そう。", "软乎乎地挤过去…": "やわらかく通過中…", "体积没消失，只是换了个形状。": "体積は消えず、形だけ変わっています。", "挤过去，合在一起了。": "通り抜けて合体しました。", "下次小水果卡住时，就用这一招。": "次に小さいフルーツが詰まったらこの方法を。", "练习完成。揉软让水果穿过缝隙，并合成了蜜桃。": "練習完了。やわらかくしてすき間を通り、モモに合成しました。", "这颗大西瓜，属于你": "この大きなスイカはあなたのもの", "达到自己的最高纪录": "自己ベスト更新", "合出来了！": "できた！", "果池装满啦。": "プールがいっぱいです。", "还可以继续冲分。西瓜会留在果池里，不会消除。": "まだスコアを伸ばせます。スイカはプールに残り、消えません。", "水果开始揉软，持续2.4秒。": "2.4秒間フルーツをやわらかくします。", "合成了！继续放，卡住时试试揉软。": "合成成功！続けて落とし、詰まったらやわらかくしてみよう。", "水果图片未能载入，请重新打开文件。": "フルーツ画像を読み込めませんでした。ページを開き直してください。", "松手放下 · 拖出果池可取消": "離して投下 · 外へドラッグでキャンセル", "已移出果池，松手会取消": "プール外 · 離すとキャンセル", "左右移动 · 松手放下第一颗": "左右移動 · 最初のフルーツを離す", "左右移动 · 松手投放": "左右移動 · 離して投下", "软乎乎的…": "やわらかい…", "再攒一点能量": "もう少しエネルギーをためよう",
        "两颗猕猴桃，被挡板隔开了。": "2つのキウイが障害物で分かれています。", "缝隙太窄了。点一下软化，让果肉挤过去。": "すき間が狭すぎます。やわらかくして通しましょう。", "果肉变软了，正在挤过缝隙。": "やわらかくなってすき間を通っています。", "果肉正在恢复弹性。": "弾力を取り戻しています。", "挤过去了！同样的水果碰到一起，就会合成。": "通り抜けた！同じフルーツは触れると合成します。", "有点窄": "ちょっと狭い", "看下落加速、触地压缩，以及回弹后的余振。": "落下の加速、接地時の圧縮、反発後の揺れを見ます。", "看小水果接触大水果时，两边的轮廓怎样变化。": "小さいフルーツが大きいフルーツに触れた時の輪郭変化を見ます。", "看两颗相同水果接触后，怎样变成新水果。": "同じフルーツが接触して新しいフルーツになる様子を見ます。", "留点空隙": "すき間を残そう", "首次接触 {time} s · 速度 {speed} px/s": "初回接触 {time} s · 速度 {speed} px/s", "接触蓄力 {time} s": "接触蓄積 {time} s", "完成合成 {time} s · 产生新水果": "合成完了 {time} s · 新しいフルーツ", "果 {id}": "果実 {id}", "果 {id} · 宽 {width} / 高 {height} · W/H {ratio}": "果実 {id} · 幅 {width} / 高さ {height} · W/H {ratio}", "软乎乎的 · 还剩 {seconds} 秒": "やわらか中 · 残り{seconds}秒", "连续合成 {count} 次": "連続合成 ×{count}", "还有 {seconds} 秒": "残り{seconds}秒", "挤进空隙 · 消耗 {cost}": "すき間へ · {cost}消費", "再合成 {count} 次就能用": "あと{count}回合成で使用可能", "下一颗水果：{fruit}": "次のフルーツ：{fruit}", "合成{fruit}，获得{points}分。": "{fruit}を合成、{points}点獲得。", "这一局合成了 {count} 次。下次试着把大水果放在一侧，别把小水果埋在底下。": "今回は{count}回合成しました。次は大きいフルーツを片側に寄せ、小さいフルーツを底に埋めないようにしてみよう。"
    },
    "ko": {
        "软西瓜 · 果冻工坊 · 挑战版": "말랑 수박 · 젤리 공방 · 챌린지", "软西瓜": "말랑 수박", "挑战版": "챌린지", "游戏设置": "게임 설정", "打开慢镜头": "슬로 모션 열기", "关闭慢镜头": "슬로 모션 닫기", "慢镜头": "슬로 모션", "怎么玩": "게임 방법", "玩法": "방법", "开启声音": "소리 켜기", "关闭声音": "소리 끄기", "声音": "소리", "暂停游戏": "게임 일시정지", "继续游戏": "게임 계속", "暂停 · P": "일시정지 · P", "暂停": "일시정지", "继续": "계속",
        "一小池，软乎乎": "작은 풀, 말랑말랑", "揉一揉，": "말랑하게 눌러,", "合个大西瓜": "큰 수박을 만들자", "相同水果合在一起。": "같은 과일을 합치세요.", "太挤了，就让它们软一点。": "너무 빽빽하면 조금 부드럽게 하세요.", "今天，合到这颗！": "오늘 목표는 이 과일!", "留点空隙，也留点好运。": "공간도, 행운도 조금 남겨두세요.", "软西瓜游戏": "말랑 수박 게임", "这一局": "이번 판", "最高纪录": "최고 기록", "下一颗": "다음", "下一颗水果": "다음 과일",
        "水果投放区。拖动瞄准，松手投放。左右方向键瞄准，回车投放，空格揉软，A D 倾斜，P 暂停。": "과일 투하 영역. 드래그로 조준하고 놓아서 투하합니다. 좌우 키로 조준, Enter로 투하, Space로 부드럽게, A/D로 기울이기, P로 일시정지.", "图片准备中…": "이미지 로딩 중…", "图片准备中": "이미지 로딩 중", "歇一会儿": "잠깐 쉬기", "果冻等你回来。": "젤리가 돌아오길 기다려요.", "继续合成": "계속 합치기", "快满了，给水果腾点地方": "거의 찼어요 — 공간을 만드세요", "左右移动，松手放下第一颗。": "좌우로 움직인 뒤 첫 과일을 놓으세요.", "跳过教学": "튜토리얼 건너뛰기",
        "接下来": "다음", "先看看下一颗，": "다음 과일을 보고,", "给它留个位置。": "자리를 남겨두세요.", "倾斜与软化控制": "기울이기 및 부드럽게 하기", "按住向左倾斜，每秒消耗10能量": "길게 눌러 왼쪽으로 기울이기, 초당 에너지 10 소모", "左倾": "왼쪽", "10/秒": "10/초", "揉软水果，消耗60能量": "과일 부드럽게 하기, 에너지 60 소모", "揉软一下": "부드럽게", "挤进空隙 · 消耗 60": "틈으로 밀기 · 60 소모", "按住向右倾斜，每秒消耗10能量": "길게 눌러 오른쪽으로 기울이기, 초당 에너지 10 소모", "右倾": "오른쪽", "果汁能量": "주스 에너지", "合成 +2": "합치기 +2", "拖出果池再松手，可取消投放": "풀 밖으로 드래그한 뒤 놓으면 취소", "重新开始 ↻": "다시 시작 ↻", "重新开始": "다시 시작",
        "一个小窍门": "작은 팁", "小水果卡住时，": "작은 과일이 끼면,", "试试": "한번", "揉软": "부드럽게", "看看怎么挤过去": "틈을 통과하는 법 보기", "瞄准": "조준", "投放": "투하", "倾斜": "기울이기", "水果合成顺序": "과일 합성 순서", "从小蓝莓": "블루베리부터", "到大西瓜": "수박까지", "两颗相同水果，合成下一颗。": "같은 과일 두 개가 다음 과일로 합쳐집니다.", "慢慢来，软着玩。": "천천히, 말랑하게 즐기세요.", "减少动态效果": "움직임 줄이기", "恢复完整动态": "전체 움직임 복원",
        "关闭玩法说明": "설명 닫기", "一点点上手": "하나씩 배우기", "给水果找个好位置。": "과일에 좋은 자리를 찾아주세요.", "松手投放": "놓아서 투하", "左右拖动瞄准，松手放下。拖出果池再松手，就能取消。": "좌우로 드래그해 조준하고 놓습니다. 풀 밖으로 드래그한 뒤 놓으면 취소됩니다.", "相同的会合成": "같은 과일은 합쳐짐", "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "같은 과일이 닿으면 다음 과일이 됩니다. 총 11단계이며 다음 과일은 앞 5단계에서 무작위로 나옵니다. 연속 합성은 더 높은 점수를 줍니다.", "挤不动，揉软一下": "막혔다면 부드럽게", "点“揉软一下”，水果会软化 2.4 秒，消耗 60 能量。每次合成补充 2 能量。倾斜每秒消耗 10 能量，和揉软共用。": "“부드럽게”를 누르면 2.4초 동안 부드러워지고 에너지 60을 사용합니다. 합성할 때마다 2 회복하며, 기울이기는 초당 10을 사용합니다.", "别越过红线": "빨간 선을 넘지 마세요", "水果稳定越过红线 3 秒，本局结束。西瓜不会消除，合出后可以继续冲分。": "과일이 빨간 선 위에 3초 동안 머물면 게임이 끝납니다. 수박은 사라지지 않으므로 만든 뒤에도 계속 점수를 올릴 수 있습니다.", "练一次揉软": "부드럽게 하기 연습", "回到游戏": "게임으로 돌아가기", "跳过软化练习": "연습 건너뛰기", "亲手试一下 · 练习不影响当前对局": "직접 해보기 · 연습은 현재 게임에 영향을 주지 않습니다", "差一点，就能碰到伙伴。": "조금만 더 가면 짝에 닿아요.", "点一下揉软，让上面的果肉挤过缝隙。": "부드럽게 해서 위 과일을 틈으로 밀어 넣으세요.", "软化练习：一颗猕猴桃被卡在缝隙上方，下方还有一颗猕猴桃。": "연습: 키위 하나가 틈 위에 걸려 있고 아래에 또 다른 키위가 있습니다.", "揉软看看": "부드럽게 해보기", "学会了，继续合成": "알겠어요 — 계속 합치기", "再试一次": "다시 시도", "新的一局": "새 게임", "换一池新水果？": "새 과일 풀로 시작할까요?", "这一局会重新开始，最高纪录会保留。": "현재 게임을 다시 시작하며 최고 기록은 유지됩니다.", "接着玩": "계속하기", "这一池，收获满满": "과일이 가득한 풀", "又离大西瓜近了一点。": "큰 수박에 한 걸음 더 가까워졌어요.", "再来一局": "한 판 더", "继续挑战": "계속 도전",
        "把一瞬间，放慢一点": "순간을 천천히", "同一套水果运动，放慢看压缩与回弹。": "같은 과일 움직임을 느리게 보며 압축과 반발을 확인합니다.", "选择动作场景": "장면 선택", "单果落地": "과일 하나 낙하", "大小碰撞": "큰/작은 충돌", "同果合成": "같은 과일 합성", "模拟时刻": "시뮬레이션 시간", "水果慢镜头。可开启显示真实节点。": "과일 슬로 모션. 실제 노드를 표시할 수 있습니다.", "拖动时间轴": "타임라인 이동", "慢镜头时间轴，单位秒": "슬로 모션 타임라인(초)", "慢镜头播放控制": "슬로 모션 재생 제어", "播放速度": "재생 속도", "正常速度": "정상 속도", "四分之一速度": "1/4 속도", "前进 1/60 秒模拟时间": "시뮬레이션 1/60초 진행", "+1 帧": "+1 프레임", "重来": "초기화", "显示真实节点": "실제 노드 표시", "还未接触": "아직 접촉 없음", "宽高单位为逻辑像素。+1 帧前进 1/60 秒。": "너비와 높이는 논리 픽셀입니다. +1 프레임은 1/60초 진행합니다.", "验证记录": "QA 도구", "40 果实压力场景": "과일 40개 스트레스", "大水果气泡外膜": "큰 과일 버블 막", "连续中间投放": "중앙 연속 투하", "查看结束画面": "게임 종료 화면", "查看西瓜画面": "수박 화면",
        "蓝莓": "블루베리", "葡萄": "포도", "樱桃": "체리", "橙子": "오렌지", "柠檬": "레몬", "苹果": "사과", "猕猴桃": "키위", "蜜桃": "복숭아", "椰子": "코코넛", "哈密瓜": "멜론", "西瓜": "수박",
        "新的一局，先看看已有水果的位置。": "새 게임입니다. 먼저 현재 과일 위치를 확인하세요.", "左右移动，给第一颗水果选个落点。": "좌우로 움직여 첫 과일의 착지 지점을 고르세요.", "再放一颗也可以，相同水果碰到一起就会合成。": "과일을 하나 더 놓아보세요. 같은 과일은 닿으면 합쳐집니다.", "合成了！接着，亲手试一次揉软。": "합성 성공! 이제 직접 부드럽게 해보세요.", "先看下一颗，再给它留个位置。": "다음 과일을 보고 자리를 남겨두세요.", "软乎乎地挤过去…": "말랑하게 통과 중…", "体积没消失，只是换了个形状。": "부피는 그대로이고 모양만 바뀌었어요.", "挤过去，合在一起了。": "통과해서 합쳐졌어요.", "下次小水果卡住时，就用这一招。": "다음에 작은 과일이 끼면 이 방법을 써보세요.", "练习完成。揉软让水果穿过缝隙，并合成了蜜桃。": "연습 완료. 부드럽게 해서 틈을 통과하고 복숭아로 합쳤습니다.", "这颗大西瓜，属于你": "이 큰 수박은 당신 것", "达到自己的最高纪录": "개인 최고 기록", "合出来了！": "만들었어요!", "果池装满啦。": "과일 풀이 가득 찼어요.", "还可以继续冲分。西瓜会留在果池里，不会消除。": "계속 점수를 올릴 수 있습니다. 수박은 풀에 남아 사라지지 않습니다.", "水果开始揉软，持续2.4秒。": "과일이 2.4초 동안 부드러워집니다.", "合成了！继续放，卡住时试试揉软。": "합성 성공! 계속 놓고, 막히면 부드럽게 해보세요.", "水果图片未能载入，请重新打开文件。": "과일 이미지를 불러오지 못했습니다. 페이지를 다시 열어주세요.", "松手放下 · 拖出果池可取消": "놓아서 투하 · 밖으로 드래그해 취소", "已移出果池，松手会取消": "풀 밖 · 놓으면 취소", "左右移动 · 松手放下第一颗": "좌우 이동 · 첫 과일 놓기", "左右移动 · 松手投放": "좌우 이동 · 놓아서 투하", "软乎乎的…": "말랑말랑…", "再攒一点能量": "에너지를 조금 더 모으세요",
        "两颗猕猴桃，被挡板隔开了。": "키위 두 개가 장애물로 나뉘어 있습니다.", "缝隙太窄了。点一下软化，让果肉挤过去。": "틈이 너무 좁습니다. 부드럽게 해서 통과시키세요.", "果肉变软了，正在挤过缝隙。": "과일이 부드러워져 틈을 통과하고 있습니다.", "果肉正在恢复弹性。": "과일이 탄성을 되찾고 있습니다.", "挤过去了！同样的水果碰到一起，就会合成。": "통과했습니다! 같은 과일은 닿으면 합쳐집니다.", "有点窄": "조금 좁아요", "看下落加速、触地压缩，以及回弹后的余振。": "낙하 가속, 충돌 압축, 반발 후 흔들림을 확인합니다.", "看小水果接触大水果时，两边的轮廓怎样变化。": "작은 과일이 큰 과일에 닿을 때 양쪽 윤곽 변화를 확인합니다.", "看两颗相同水果接触后，怎样变成新水果。": "같은 과일 두 개가 닿은 뒤 새 과일로 변하는 과정을 확인합니다.", "留点空隙": "공간을 남기세요", "首次接触 {time} s · 速度 {speed} px/s": "첫 접촉 {time} s · 속도 {speed} px/s", "接触蓄力 {time} s": "접촉 축적 {time} s", "完成合成 {time} s · 产生新水果": "합성 완료 {time} s · 새 과일 생성", "果 {id}": "과일 {id}", "果 {id} · 宽 {width} / 高 {height} · W/H {ratio}": "과일 {id} · 너비 {width} / 높이 {height} · W/H {ratio}", "软乎乎的 · 还剩 {seconds} 秒": "말랑한 상태 · {seconds}초 남음", "连续合成 {count} 次": "연속 합성 ×{count}", "还有 {seconds} 秒": "{seconds}초 남음", "挤进空隙 · 消耗 {cost}": "틈으로 밀기 · {cost} 소모", "再合成 {count} 次就能用": "{count}번 더 합치면 사용 가능", "下一颗水果：{fruit}": "다음 과일: {fruit}", "合成{fruit}，获得{points}分。": "{fruit} 합성, {points}점 획득.", "这一局合成了 {count} 次。下次试着把大水果放在一侧，别把小水果埋在底下。": "이번 판에서 {count}번 합쳤습니다. 다음에는 큰 과일을 한쪽에 두어 작은 과일이 바닥에 묻히지 않게 해보세요."
    }
}

I18N_CORE = r"""(function () {
  'use strict';

  const SOURCE_LOCALE = 'zh-CN';
  const STORAGE_KEY = 'melt-melon.locale';
  const LOCALES = Object.freeze([
    { id: 'zh-CN', label: '中文' },
    { id: 'en', label: 'English' },
    { id: 'vi', label: 'Tiếng Việt' },
    { id: 'ja', label: '日本語' },
    { id: 'ko', label: '한국어' },
  ]);
  const localeIds = new Set(LOCALES.map(locale => locale.id));
  const textSources = new WeakMap();
  const textRendered = new WeakMap();
  const attributeState = new WeakMap();
  let currentLocale = resolveInitialLocale();
  let observer = null;

  function normalizeLocale(value) {
    const input = String(value || '').toLowerCase();
    if (input.startsWith('zh')) return 'zh-CN';
    for (const id of ['en', 'vi', 'ja', 'ko']) if (input === id || input.startsWith(`${id}-`)) return id;
    return null;
  }

  function resolveInitialLocale() {
    try {
      const saved = normalizeLocale(localStorage.getItem(STORAGE_KEY));
      if (saved && localeIds.has(saved)) return saved;
    } catch (_) {}
    for (const language of navigator.languages || [navigator.language]) {
      const locale = normalizeLocale(language);
      if (locale && localeIds.has(locale)) return locale;
    }
    return SOURCE_LOCALE;
  }

  function interpolate(message, values = {}) {
    return String(message).replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
  }

  function t(source, values = {}) {
    const catalog = window.MelonLocales?.[currentLocale] || {};
    return interpolate(catalog[source] || source, values);
  }

  function translateRaw(raw) {
    if (!raw || currentLocale === SOURCE_LOCALE) return raw;
    const match = String(raw).match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) return raw;
    const [, before, body, after] = match;
    if (!body) return raw;
    const translated = t(body);
    return `${before}${translated}${after}`;
  }

  function translateTextNode(node) {
    const previousRendered = textRendered.get(node);
    if (!textSources.has(node) || (previousRendered !== undefined && node.nodeValue !== previousRendered)) {
      textSources.set(node, node.nodeValue);
    }
    const source = textSources.get(node);
    const rendered = translateRaw(source);
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
    textRendered.set(node, rendered);
  }

  function getAttributeRecord(element, name) {
    let records = attributeState.get(element);
    if (!records) { records = new Map(); attributeState.set(element, records); }
    let record = records.get(name);
    const current = element.getAttribute(name);
    if (!record || current !== record.rendered) {
      record = { source: current, rendered: current };
      records.set(name, record);
    }
    return record;
  }

  function translateAttribute(element, name) {
    if (!element.hasAttribute(name)) return;
    const record = getAttributeRecord(element, name);
    const rendered = translateRaw(record.source);
    if (element.getAttribute(name) !== rendered) element.setAttribute(name, rendered);
    record.rendered = rendered;
  }

  function translateElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(element.tagName)) return;
    for (const name of ['aria-label', 'title', 'placeholder', 'alt']) translateAttribute(element, name);
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent || !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName)) translateTextNode(node);
      } else translateElement(node);
    }
  }

  function createLanguagePicker() {
    const utilities = document.querySelector('.utilities');
    if (!utilities || document.getElementById('language-select')) return;
    const label = document.createElement('label');
    label.className = 'language-picker';
    label.setAttribute('aria-label', 'Language');
    const icon = document.createElement('span');
    icon.className = 'language-picker-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🌐';
    const select = document.createElement('select');
    select.id = 'language-select';
    select.setAttribute('aria-label', 'Language');
    for (const locale of LOCALES) {
      const option = document.createElement('option');
      option.value = locale.id;
      option.textContent = locale.label;
      select.append(option);
    }
    select.value = currentLocale;
    select.addEventListener('change', () => setLocale(select.value));
    label.append(icon, select);
    utilities.append(label);
  }

  function setLocale(locale) {
    const normalized = normalizeLocale(locale);
    if (!normalized || !localeIds.has(normalized)) return false;
    currentLocale = normalized;
    try { localStorage.setItem(STORAGE_KEY, currentLocale); } catch (_) {}
    document.documentElement.lang = currentLocale;
    const picker = document.getElementById('language-select');
    if (picker) picker.value = currentLocale;
    translateTree(document.documentElement);
    document.dispatchEvent(new CustomEvent('melon:localechange', { detail: { locale: currentLocale } }));
    return true;
  }

  function formatNumber(value, options) {
    const numeric = Number(value);
    return new Intl.NumberFormat(currentLocale, options).format(Number.isFinite(numeric) ? numeric : 0);
  }

  function start() {
    createLanguagePicker();
    document.documentElement.lang = currentLocale;
    translateTree(document.documentElement);
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        else if (mutation.type === 'attributes') translateAttribute(mutation.target, mutation.attributeName);
        else for (const node of mutation.addedNodes) translateTree(node);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'],
    });
  }

  window.MelonI18n = Object.freeze({
    t, setLocale, formatNumber, locales: LOCALES,
    get locale() { return currentLocale; },
  });

  start();
})();"""

VALIDATOR = r'''#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
LOCALES = ('en', 'vi', 'ja', 'ko')
HAN = re.compile(r'[\u3400-\u9fff]')

class TextCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.values = set()
    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'code', 'pre'}:
            self.skip += 1
        for name, value in attrs:
            if name in {'aria-label', 'title', 'placeholder', 'alt'} and value and HAN.search(value):
                self.values.add(value.strip())
    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'code', 'pre'} and self.skip:
            self.skip -= 1
    def handle_data(self, data):
        value = data.strip()
        if not self.skip and value and HAN.search(value):
            self.values.add(value)

def load_locale(locale):
    text = (ROOT / f'src/i18n/locales/{locale}.js').read_text(encoding='utf-8')
    match = re.search(r'Object\.freeze\((\{[\s\S]*\})\);\s*$', text)
    assert match, f'Cannot parse locale {locale}'
    return json.loads(match.group(1))

html = INDEX.read_text(encoding='utf-8')
assert INDEX.stat().st_size < 100_000, 'index.html regressed into a monolith'
assert '<style' not in html.lower(), 'inline <style> is not allowed'
for script in re.finditer(r'<script\b([^>]*)>', html, re.I):
    assert 'src=' in script.group(1), 'inline <script> is not allowed'
assert 'data:image/png;base64' not in html, 'embedded PNG atlas must stay external'
assert "script-src 'self'" in html and "style-src 'self'" in html and "img-src 'self'" in html, 'CSP must allow local static assets'
assert "'unsafe-inline'" not in html, 'CSP should not need unsafe-inline after refactor'

for relative in re.findall(r'(?:src|href)="\./([^"?#]+)', html):
    assert (ROOT / relative).exists(), f'Missing referenced file: {relative}'

atlas = ROOT / 'assets/fruit-atlas.png'
assert atlas.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n', 'fruit atlas is not a PNG'
assert atlas.stat().st_size > 100_000, 'fruit atlas looks unexpectedly small'

catalogs = {locale: load_locale(locale) for locale in LOCALES}
keysets = {locale: set(catalog) for locale, catalog in catalogs.items()}
assert len({frozenset(keys) for keys in keysets.values()}) == 1, 'locale catalogs must expose the same keys'

collector = TextCollector(); collector.feed(html)
missing = {locale: sorted(value for value in collector.values if value not in catalogs[locale]) for locale in LOCALES}
for locale, values in missing.items():
    assert not values, f'{locale} is missing static translations: {values}'

required_dynamic = {
    '软乎乎的 · 还剩 {seconds} 秒', '连续合成 {count} 次', '还有 {seconds} 秒',
    '挤进空隙 · 消耗 {cost}', '再合成 {count} 次就能用', '下一颗水果：{fruit}',
    '合成{fruit}，获得{points}分。', '这一局合成了 {count} 次。下次试着把大水果放在一侧，别把小水果埋在底下。',
    '首次接触 {time} s · 速度 {speed} px/s', '接触蓄力 {time} s',
    '完成合成 {time} s · 产生新水果', '果 {id}', '果 {id} · 宽 {width} / 高 {height} · W/H {ratio}',
}
for locale, catalog in catalogs.items():
    assert required_dynamic <= set(catalog), f'{locale} is missing dynamic translations'
print(f'Validated {len(collector.values)} static translatable strings across {len(LOCALES)} locales.')
'''

ARCHITECTURE = r'''# Architecture

Melt Melon remains a build-free GitHub Pages game. The refactor separates responsibilities without introducing a bundler or framework.

## Runtime order

1. `src/i18n/locales/*.js` registers translation catalogs.
2. `src/i18n/core.js` selects the locale, translates static/dynamic DOM text, and exposes `MelonI18n.t()` / `formatNumber()`.
3. `src/config/fruit-catalog.js` defines stable fruit IDs plus visual metadata.
4. `src/physics/soft-world.js` owns soft-body physics.
5. `src/game/melon-game.js` owns game state and rules.
6. `src/input/melon-input.js` translates pointer/keyboard input into game actions.
7. Rendering and feature modules add visuals, feedback, lessons, and motion inspection.
8. `src/app.js` wires modules together and owns page-level orchestration.

## Design rules

- Keep physics independent of the DOM.
- Keep game rules independent of rendering.
- Put user-facing text in locale catalogs. Chinese source strings act as gettext-style message IDs so existing markup can remain readable and build-free.
- Use placeholder messages (`{count}`, `{fruit}`, etc.) for dynamic text instead of string concatenation.
- Keep binary assets in `assets/`; never embed multi-megabyte base64 payloads in HTML/JS.
- Preserve classic script dependency order unless the project intentionally migrates to ES modules in a dedicated change.

## Adding a language

Copy one file in `src/i18n/locales/`, translate every existing key, add the locale metadata in `src/i18n/core.js`, and add the script to `index.html`. `scripts/validate_static.py` checks locale-key parity and static translation coverage.

## Validation

Run:

```bash
python3 scripts/validate_static.py
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```
'''

README = r'''# Melt Melon

A build-free soft-body fruit merge game for GitHub Pages. The project uses Canvas and vanilla JavaScript, with no framework or bundling step.

## Languages

The UI supports Simplified Chinese, English, Vietnamese, Japanese, and Korean. The first visit follows the browser language when supported, and the selected language is saved locally.

## Project structure

```text
assets/                     # Binary artwork
src/
  config/                   # Stable game/catalog metadata
  physics/                  # Soft-body simulation
  game/                     # Game rules and state
  input/                    # Pointer/keyboard input
  rendering/                # Fruit renderer and feedback effects
  features/                 # Softening lesson and motion lab
  i18n/                     # Translation runtime + locale catalogs
  styles/                   # Page styles
  app.js                    # Page orchestration/bootstrap
scripts/                    # Static validation
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module boundaries and contribution rules.

## Run locally

You can open `index.html` directly, or serve the repository root with any static server. No install/build step is required.

## Controls

Move the pointer or use the arrow keys to aim. Click/release or press Enter to drop a fruit. Press Space to soften the pool, A/D to tilt, and P to pause.

## Quality checks

```bash
python3 scripts/validate_static.py
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

The same checks run in GitHub Actions on pull requests and pushes to `main`.
'''

QUALITY_WORKFLOW = r'''name: Quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Validate static architecture and translations
        run: python3 scripts/validate_static.py
      - name: Check JavaScript syntax
        shell: bash
        run: find src -name '*.js' -print0 | xargs -0 -n1 node --check
'''

PICKER_CSS = r'''

/* Language picker --------------------------------------------------------- */
.language-picker {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  min-height: 36px;
  padding: 0 .55rem;
  border: 1px solid color-mix(in srgb, #73845f 24%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, #fffdf4 86%, transparent);
  color: #55644b;
  font-size: 12px;
}
.language-picker-icon { font-size: 13px; line-height: 1; }
.language-picker select {
  max-width: 112px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
@media (max-width: 760px) {
  .language-picker { padding: 0 .4rem; }
  .language-picker select { max-width: 88px; }
}
'''


def create_locale_files() -> None:
    for locale, catalog in TRANSLATIONS.items():
        content = (
            "window.MelonLocales = window.MelonLocales || {};\n"
            f"window.MelonLocales[{json.dumps(locale)}] = Object.freeze("
            + json.dumps(catalog, ensure_ascii=False, indent=2)
            + ");\n"
        )
        write(f"src/i18n/locales/{locale}.js", content)
    write("src/i18n/core.js", I18N_CORE)


def patch_index() -> None:
    path = ROOT / "index.html"
    html = path.read_text(encoding="utf-8")
    html = re.sub(
        r'<meta http-equiv="Content-Security-Policy" content="[^"]+">',
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src \'self\' data:; style-src \'self\'; script-src \'self\'; connect-src \'none\'; media-src \'self\' data:">',
        html,
        count=1,
    )
    first_script = html.index('  <script src="./src/config/fruit-catalog.js"></script>')
    end_scripts = html.index('\n</body>', first_script)
    scripts = '''  <script src="./src/i18n/locales/en.js"></script>\n  <script src="./src/i18n/locales/vi.js"></script>\n  <script src="./src/i18n/locales/ja.js"></script>\n  <script src="./src/i18n/locales/ko.js"></script>\n  <script src="./src/i18n/core.js"></script>\n  <script src="./src/config/fruit-catalog.js"></script>\n  <script src="./src/physics/soft-world.js"></script>\n  <script src="./src/game/melon-game.js"></script>\n  <script src="./src/input/melon-input.js"></script>\n  <script src="./src/rendering/fruit-painter.js"></script>\n  <script src="./src/features/softening-lesson.js"></script>\n  <script src="./src/rendering/melon-feedback.js"></script>\n  <script src="./src/features/motion-lab.js"></script>\n  <script src="./src/assets.js"></script>\n  <script src="./src/app.js"></script>'''
    html = html[:first_script] + scripts + html[end_scripts:]
    path.write_text(html, encoding="utf-8")


def patch_styles() -> None:
    path = ROOT / "src/styles/main.css"
    css = path.read_text(encoding="utf-8")
    if "/* Language picker" not in css:
        css += PICKER_CSS
    path.write_text(css.rstrip() + "\n", encoding="utf-8")


def patch_fruit_catalog() -> None:
    path = ROOT / "src/config/fruit-catalog.js"
    text = path.read_text(encoding="utf-8")
    old = """  const names = ['蓝莓', '葡萄', '樱桃', '橙子', '柠檬', '苹果', '猕猴桃', '蜜桃', '椰子', '哈密瓜', '西瓜'];\n  const colors = ['#6371ac', '#8760b0', '#d7475b', '#f69e38', '#efce53', '#ca5953', '#97ae51', '#edac99', '#b48b62', '#a9ba78', '#5d9970', '#e87977'];\n  window.MelonFruitCatalog = Object.freeze({ names: Object.freeze(names), colors: Object.freeze(colors), finalLevel: names.length - 1, logoLevel: names.length, atlasColumns: 4, atlasRows: 3 });"""
    new = """  const fruitData = [\n    ['blueberry', '蓝莓', '#6371ac'], ['grape', '葡萄', '#8760b0'], ['cherry', '樱桃', '#d7475b'],\n    ['orange', '橙子', '#f69e38'], ['lemon', '柠檬', '#efce53'], ['apple', '苹果', '#ca5953'],\n    ['kiwi', '猕猴桃', '#97ae51'], ['peach', '蜜桃', '#edac99'], ['coconut', '椰子', '#b48b62'],\n    ['cantaloupe', '哈密瓜', '#a9ba78'], ['watermelon', '西瓜', '#5d9970'],\n  ];\n  const fruits = Object.freeze(fruitData.map(([id, name, color]) => Object.freeze({ id, name, color })));\n  const ids = Object.freeze(fruits.map(fruit => fruit.id));\n  const names = Object.freeze(fruits.map(fruit => fruit.name));\n  const colors = Object.freeze(fruits.map(fruit => fruit.color));\n  window.MelonFruitCatalog = Object.freeze({ fruits, ids, names, colors, finalLevel: names.length - 1, logoLevel: names.length, atlasColumns: 4, atlasRows: 3 });"""
    text = replace_once(text, old, new, "fruit catalog")
    path.write_text(text, encoding="utf-8")


def patch_app() -> None:
    path = ROOT / "src/app.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "  const byId = id => document.getElementById(id);",
        "  const byId = id => document.getElementById(id);\n  const t = (message, values) => window.MelonI18n.t(message, values);\n  const formatNumber = value => window.MelonI18n.formatNumber(value);",
        "app i18n helpers",
    )
    text = replace_once(text, "game.state.score.toLocaleString('zh-CN')", "formatNumber(game.state.score)", "result number")
    text = replace_once(text, "state.score.toLocaleString('zh-CN')", "formatNumber(state.score)", "score number")
    text = replace_once(text, "bestScore.toLocaleString('zh-CN')", "formatNumber(bestScore)", "best number")
    text = replace_once(
        text,
        "`这一局合成了 ${game.state.mergeCount} 次。下次试着把大水果放在一侧，别把小水果埋在底下。`",
        "t('这一局合成了 {count} 次。下次试着把大水果放在一侧，别把小水果埋在底下。', { count: game.state.mergeCount })",
        "result dynamic text",
    )
    text = replace_once(
        text,
        "say(`合成${FRUIT_NAMES[Math.min(event.level, FINAL_LEVEL)]}，获得${event.points}分。`);",
        "say(t('合成{fruit}，获得{points}分。', { fruit: t(FRUIT_NAMES[Math.min(event.level, FINAL_LEVEL)]), points: event.points }));",
        "merge announcement",
    )
    text = replace_once(
        text,
        "return `软乎乎的 · 还剩 ${game.state.liquidRemainingSeconds.toFixed(1)} 秒`;",
        "return t('软乎乎的 · 还剩 {seconds} 秒', { seconds: game.state.liquidRemainingSeconds.toFixed(1) });",
        "soft hint",
    )
    text = replace_once(
        text,
        "byId('combo').textContent = state.combo > 1 && state.time - state.lastMergeTime < 1.15 ? `连续合成 ${state.combo} 次` : '';",
        "byId('combo').textContent = state.combo > 1 && state.time - state.lastMergeTime < 1.15 ? t('连续合成 {count} 次', { count: state.combo }) : '';",
        "combo translation",
    )
    text = replace_once(
        text,
        "byId('soften-detail').textContent = isSoftening ? `还有 ${state.liquidRemainingSeconds.toFixed(1)} 秒` : canAfford ? `挤进空隙 · 消耗 ${game.options.softenCost}` : `再合成 ${Math.ceil((game.options.softenCost - state.energy) / game.options.energyPerMerge)} 次就能用`;",
        "byId('soften-detail').textContent = isSoftening ? t('还有 {seconds} 秒', { seconds: state.liquidRemainingSeconds.toFixed(1) }) : canAfford ? t('挤进空隙 · 消耗 {cost}', { cost: game.options.softenCost }) : t('再合成 {count} 次就能用', { count: Math.ceil((game.options.softenCost - state.energy) / game.options.energyPerMerge) });",
        "soften detail translation",
    )
    text = replace_once(
        text,
        "byId(id).setAttribute('aria-label', `下一颗水果：${FRUIT_NAMES[state.nextLevel]}`);",
        "byId(id).setAttribute('aria-label', t('下一颗水果：{fruit}', { fruit: t(FRUIT_NAMES[state.nextLevel]) }));",
        "next fruit aria",
    )
    text = replace_once(text, "context.fillText('留点空隙', 41, game.options.warningY - 9);", "context.fillText(t('留点空隙'), 41, game.options.warningY - 9);", "canvas translation")
    path.write_text(text, encoding="utf-8")


def patch_lesson() -> None:
    path = ROOT / "src/features/softening-lesson.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "ctx.fillText('有点窄', 230, 343);", "ctx.fillText(window.MelonI18n.t('有点窄'), 230, 343);", "lesson canvas translation")
    path.write_text(text, encoding="utf-8")


def patch_motion_lab() -> None:
    path = ROOT / "src/features/motion-lab.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "  const WIDTH = 460, HEIGHT = 640, FRAME_SECONDS = 1 / 60;", "  const WIDTH = 460, HEIGHT = 640, FRAME_SECONDS = 1 / 60;\n  const t = (message, values) => window.MelonI18n.t(message, values);", "motion helper")
    text = replace_once(text, "hintOutput.textContent = SCENES[sceneName].hint;", "hintOutput.textContent = t(SCENES[sceneName].hint);", "motion hint")
    text = replace_once(text, "latestEvent = `首次接触 ${simulationTime.toFixed(3)} s · 速度 ${Math.round(impact.speed || 0)} px/s`;", "latestEvent = t('首次接触 {time} s · 速度 {speed} px/s', { time: simulationTime.toFixed(3), speed: Math.round(impact.speed || 0) });", "first contact")
    text = replace_once(text, "if (event.type === 'merge-start') latestEvent = `接触蓄力 ${elapsedSeconds().toFixed(3)} s`;", "if (event.type === 'merge-start') latestEvent = t('接触蓄力 {time} s', { time: elapsedSeconds().toFixed(3) });", "merge start")
    text = replace_once(text, "if (event.type === 'merge') latestEvent = `完成合成 ${elapsedSeconds().toFixed(3)} s · 产生新水果`;", "if (event.type === 'merge') latestEvent = t('完成合成 {time} s · 产生新水果', { time: elapsedSeconds().toFixed(3) });", "merge complete")
    text = replace_once(text, "context.fillStyle = '#526647'; context.fillText(`果 ${body.id}`, body.x, Math.max(24, body.minY - 13)); context.restore();", "context.fillStyle = '#526647'; context.fillText(t('果 {id}', { id: body.id }), body.x, Math.max(24, body.minY - 13)); context.restore();", "motion fruit label")
    text = replace_once(text, "return `果 ${body.id} · 宽 ${width.toFixed(1)} / 高 ${height.toFixed(1)} · W/H ${(width / Math.max(height, .001)).toFixed(3)}`;", "return t('果 {id} · 宽 {width} / 高 {height} · W/H {ratio}', { id: body.id, width: width.toFixed(1), height: height.toFixed(1), ratio: (width / Math.max(height, .001)).toFixed(3) });", "motion shape")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    create_locale_files()
    patch_index()
    patch_styles()
    patch_fruit_catalog()
    patch_app()
    patch_lesson()
    patch_motion_lab()
    write("scripts/validate_static.py", VALIDATOR)
    write("docs/ARCHITECTURE.md", ARCHITECTURE)
    write("README.md", README)
    write(".github/workflows/quality.yml", QUALITY_WORKFLOW)
    print("Maintainability/i18n pass applied.")


if __name__ == "__main__":
    main()
