(() => {
  'use strict';

  const en = {
    '软西瓜': 'Soft Watermelon', '软西瓜游戏': 'Soft Watermelon game', '软西瓜 · 果冻工坊 · 挑战版': 'Soft Watermelon · Jelly Workshop · Challenge', '挑战版': 'Challenge', '游戏设置': 'Game settings',
    '一小池，软乎乎': 'A little bin, nice and soft', '揉一揉，': 'Give it a squeeze,', '合个大西瓜': 'merge a big watermelon', '相同水果合在一起。': 'Merge matching fruits together.', '太挤了，就让它们软一点。': 'If it gets crowded, soften them a little.', '今天，合到这颗！': 'Today, make this one!', '留点空隙，也留点好运。': 'Leave some space — and some luck.',
    '打开慢镜头': 'Open slow motion', '慢镜头': 'Slow motion', '怎么玩': 'How to play', '玩法': 'Help',
    '开启声音': 'Turn sound on', '关闭声音': 'Turn sound off', '声音': 'Sound', '暂停游戏': 'Pause game', '继续游戏': 'Resume game', '暂停': 'Pause', '继续': 'Resume',
    '这一局': 'Score', '最高纪录': 'Best', '下一颗': 'Next', '下一颗水果': 'Next fruit', '图片准备中…': 'Loading fruit artwork…',
    '歇一会儿': 'Take a break', '果冻等你回来。': 'The fruit will wait for you.', '继续合成': 'Keep merging', '快满了，给水果腾点地方': 'Almost full — make some room',
    '左右移动，松手放下第一颗。': 'Move left or right, then release to drop the first fruit.', '跳过教学': 'Skip tutorial',
    '接下来': 'Up next', '先看看下一颗，给它留个位置。': 'Check what is next and save a spot for it.',
    '倾斜与软化控制': 'Tilt and soften controls', '按住向左倾斜，每秒消耗10能量': 'Hold to tilt left, costs 10 energy/second', '按住向右倾斜，每秒消耗10能量': 'Hold to tilt right, costs 10 energy/second', '揉软水果，消耗60能量': 'Soften fruit, costs 60 energy', '左倾': 'Tilt left', '右倾': 'Tilt right', '揉软一下': 'Soften', '挤进空隙 · 消耗 60': 'Squeeze into gaps · costs 60',
    '瞄准': 'Aim', '投放': 'Drop', '倾斜': 'Tilt', '水果合成顺序': 'Fruit merge order', '从小蓝莓': 'From blueberry', '到大西瓜': 'to watermelon',
    '两颗相同水果，合成下一颗。': 'Merge two matching fruits into the next one.', '慢慢来，软着玩。': 'Take it easy. Keep it soft.', '减少动态效果': 'Reduce motion',
    '一点点上手': 'Quick guide', '给水果找个好位置。': 'Find a good place for each fruit.', '松手投放': 'Release to drop',
    '左右拖动瞄准，松手放下。拖出果池再松手，就能取消。': 'Drag left or right to aim, then release to drop. Drag outside the bin before releasing to cancel.',
    '相同的会合成': 'Matching fruits merge', '两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。': 'Two matching fruits merge into the next level. There are 11 levels; the next fruit is chosen from the first five, and chain merges score more.',
    '挤不动，揉软一下': 'Stuck? Soften it', '点“揉软一下”，水果会软化 2.4 秒，消耗 60 能量。每次合成补充 2 能量。倾斜每秒消耗 10 能量，和揉软共用。': 'Press “Soften” to soften fruit for 2.4 seconds at a cost of 60 energy. Each merge restores 2 energy. Tilting costs 10 energy per second and shares the same meter.',
    '别越过红线': 'Stay below the red line', '水果稳定越过红线 3 秒，本局结束。西瓜不会消除，合出后可以继续冲分。': 'If fruit stays above the red line for 3 seconds, the round ends. Watermelons do not disappear, so you can keep scoring after making one.',
    '练一次揉软': 'Practice softening', '回到游戏': 'Back to game', '跳过软化练习': 'Skip softening practice', '亲手试一下 · 练习不影响当前对局': 'Try it yourself · practice will not affect this round',
    '差一点，就能碰到伙伴。': 'Almost there — reach the matching fruit.', '点一下揉软，让上面的果肉挤过缝隙。': 'Tap Soften so the fruit above can squeeze through the gap.',
    '揉软看看': 'Try softening', '学会了，继续合成': 'Got it, keep merging', '再试一次': 'Try again', '新的一局': 'New round', '换一池新水果？': 'Start with a fresh bin?',
    '这一局会重新开始，最高纪录会保留。': 'This round will restart. Your best score will be kept.', '重新开始': 'Restart', '接着玩': 'Keep playing',
    '这一池，收获满满': 'A full harvest', '又离大西瓜近了一点。': 'One step closer to the big watermelon.', '再来一局': 'Play again', '继续挑战': 'Keep going',
    '关闭玩法说明': 'Close help', '关闭慢镜头': 'Close slow motion', '把一瞬间，放慢一点': 'Slow down the moment', '同一套水果运动，放慢看压缩与回弹。': 'Watch the same fruit motion slowly to see compression and bounce.', '选择动作场景': 'Choose motion scene', '单果落地': 'Single fruit drop', '大小碰撞': 'Large/small collision', '同果合成': 'Matching-fruit merge', '水果慢镜头。可开启显示真实节点。': 'Fruit slow motion. You can show the real physics nodes.', '拖动时间轴': 'Scrub timeline', '慢镜头时间轴，单位秒': 'Slow-motion timeline in seconds', '慢镜头播放控制': 'Slow-motion playback controls', '播放速度': 'Playback speed', '正常速度': 'Normal speed', '四分之一速度': 'Quarter speed', '前进 1/60 秒模拟时间': 'Advance 1/60 second of simulation', '+1 帧': '+1 frame', '重来': 'Restart',
    '左右移动，给第一颗水果选个落点。': 'Move left or right and choose a landing spot for the first fruit.',
    '再放一颗也可以，相同水果碰到一起就会合成。': 'Drop another one. Matching fruits merge when they touch.',
    '合成了！接着，亲手试一次揉软。': 'Merged! Next, try softening once.', '先看下一颗，再给它留个位置。': 'Check the next fruit and leave room for it.',
    '合成了！继续放，卡住时试试揉软。': 'Merged! Keep dropping; use Soften when things get stuck.',
    '软乎乎的…': 'Softening…', '再攒一点能量': 'Need more energy', '水果图片未能载入，请重新打开文件。': 'Fruit artwork could not load. Please reopen the page.', '松手放下 · 拖出果池可取消': 'Release to drop · drag outside the bin to cancel', '已移出果池，松手会取消': 'Outside the bin · release to cancel', '左右移动 · 松手放下第一颗': 'Move left/right · release the first fruit', '左右移动 · 松手投放': 'Move left/right · release to drop', '这颗大西瓜，属于你': 'This big watermelon is yours', '达到自己的最高纪录': 'A new personal best', '合出来了！': 'You made it!', '果池装满啦。': 'The fruit bin is full.', '还可以继续冲分。西瓜会留在果池里，不会消除。': 'You can keep scoring. The watermelon stays in the bin and does not disappear.',
    '蓝莓': 'Blueberry', '葡萄': 'Grape', '樱桃': 'Cherry', '橙子': 'Orange', '柠檬': 'Lemon', '苹果': 'Apple', '猕猴桃': 'Kiwi', '蜜桃': 'Peach', '椰子': 'Coconut', '哈密瓜': 'Melon', '西瓜': 'Watermelon',
    '西瓜，西瓜不会消除': 'Watermelon. Watermelons do not disappear.', '西瓜不会消除，要给新水果留出空间。': 'Watermelons do not disappear, so leave room for new fruit.', '水果投放区。拖动瞄准，松手投放。左右方向键瞄准，回车投放，空格揉软，A D 倾斜，P 暂停。': 'Fruit drop area. Drag to aim and release to drop. Arrow keys aim, Enter drops, Space softens, A/D tilts, P pauses.'
  };

  const vi = {
    '软西瓜': 'Dưa hấu mềm', '软西瓜游戏': 'Trò chơi Dưa hấu mềm', '软西瓜 · 果冻工坊 · 挑战版': 'Dưa hấu mềm · Xưởng thạch · Thử thách', '挑战版': 'Thử thách', '游戏设置': 'Cài đặt trò chơi',
    '一小池，软乎乎': 'Một khay nhỏ, thật mềm mại', '揉一揉，': 'Làm mềm một chút,', '合个大西瓜': 'ghép thành dưa hấu lớn', '相同水果合在一起。': 'Ghép các trái giống nhau.', '太挤了，就让它们软一点。': 'Nếu quá chật, hãy làm chúng mềm hơn.', '今天，合到这颗！': 'Hôm nay, ghép đến trái này!', '留点空隙，也留点好运。': 'Chừa chút khoảng trống, chừa cả chút may mắn.',
    '打开慢镜头': 'Mở quay chậm', '慢镜头': 'Quay chậm', '怎么玩': 'Cách chơi', '玩法': 'Hướng dẫn',
    '开启声音': 'Bật âm thanh', '关闭声音': 'Tắt âm thanh', '声音': 'Âm thanh', '暂停游戏': 'Tạm dừng', '继续游戏': 'Tiếp tục', '暂停': 'Tạm dừng', '继续': 'Tiếp tục',
    '这一局': 'Điểm', '最高纪录': 'Kỷ lục', '下一颗': 'Tiếp theo', '下一颗水果': 'Trái tiếp theo', '图片准备中…': 'Đang tải hình trái cây…',
    '歇一会儿': 'Nghỉ một chút', '果冻等你回来。': 'Trái cây sẽ chờ bạn quay lại.', '继续合成': 'Tiếp tục ghép', '快满了，给水果腾点地方': 'Sắp đầy rồi — hãy tạo thêm chỗ trống',
    '左右移动，松手放下第一颗。': 'Di chuyển trái/phải rồi thả để đặt trái đầu tiên.', '跳过教学': 'Bỏ qua hướng dẫn',
    '接下来': 'Tiếp theo', '先看看下一颗，给它留个位置。': 'Xem trái tiếp theo và chừa chỗ cho nó.',
    '倾斜与软化控制': 'Điều khiển nghiêng và làm mềm', '按住向左倾斜，每秒消耗10能量': 'Giữ để nghiêng trái, tốn 10 năng lượng/giây', '按住向右倾斜，每秒消耗10能量': 'Giữ để nghiêng phải, tốn 10 năng lượng/giây', '揉软水果，消耗60能量': 'Làm mềm trái cây, tốn 60 năng lượng', '左倾': 'Nghiêng trái', '右倾': 'Nghiêng phải', '揉软一下': 'Làm mềm', '挤进空隙 · 消耗 60': 'Len vào khe · tốn 60',
    '瞄准': 'Ngắm', '投放': 'Thả', '倾斜': 'Nghiêng', '水果合成顺序': 'Thứ tự ghép trái cây', '从小蓝莓': 'Từ việt quất', '到大西瓜': 'đến dưa hấu',
    '两颗相同水果，合成下一颗。': 'Ghép hai trái giống nhau để tạo trái cấp tiếp theo.', '慢慢来，软着玩。': 'Cứ từ từ, chơi thật mềm mại.', '减少动态效果': 'Giảm hiệu ứng chuyển động',
    '一点点上手': 'Hướng dẫn nhanh', '给水果找个好位置。': 'Tìm vị trí tốt cho từng trái.', '松手投放': 'Thả tay để rơi',
    '左右拖动瞄准，松手放下。拖出果池再松手，就能取消。': 'Kéo trái/phải để ngắm rồi thả tay để rơi. Kéo ra ngoài khay trước khi thả để hủy.',
    '相同的会合成': 'Trái giống nhau sẽ ghép', '两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。': 'Hai trái giống nhau chạm nhau sẽ thành trái cấp tiếp theo. Có 11 cấp; trái tiếp theo ngẫu nhiên trong 5 cấp đầu và chuỗi ghép liên tiếp cho nhiều điểm hơn.',
    '挤不动，揉软一下': 'Bị kẹt? Hãy làm mềm', '点“揉软一下”，水果会软化 2.4 秒，消耗 60 能量。每次合成补充 2 能量。倾斜每秒消耗 10 能量，和揉软共用。': 'Nhấn “Làm mềm” để trái mềm trong 2,4 giây, tốn 60 năng lượng. Mỗi lần ghép hồi 2 năng lượng. Nghiêng tốn 10 năng lượng/giây và dùng chung thanh năng lượng.',
    '别越过红线': 'Đừng vượt vạch đỏ', '水果稳定越过红线 3 秒，本局结束。西瓜不会消除，合出后可以继续冲分。': 'Nếu trái nằm ổn định trên vạch đỏ trong 3 giây, ván chơi kết thúc. Dưa hấu không biến mất nên vẫn có thể tiếp tục ghi điểm sau khi ghép được.',
    '练一次揉软': 'Tập làm mềm', '回到游戏': 'Quay lại trò chơi', '跳过软化练习': 'Bỏ qua bài tập làm mềm', '亲手试一下 · 练习不影响当前对局': 'Tự thử · bài tập không ảnh hưởng ván hiện tại',
    '差一点，就能碰到伙伴。': 'Chỉ còn một chút nữa là chạm được trái cùng loại.', '点一下揉软，让上面的果肉挤过缝隙。': 'Nhấn Làm mềm để trái phía trên len qua khe.',
    '揉软看看': 'Thử làm mềm', '学会了，继续合成': 'Hiểu rồi, tiếp tục ghép', '再试一次': 'Thử lại', '新的一局': 'Ván mới', '换一池新水果？': 'Bắt đầu với một khay trái cây mới?',
    '这一局会重新开始，最高纪录会保留。': 'Ván hiện tại sẽ bắt đầu lại, kỷ lục cao nhất vẫn được giữ.', '重新开始': 'Chơi lại', '接着玩': 'Chơi tiếp',
    '这一池，收获满满': 'Một vụ mùa đầy ắp', '又离大西瓜近了一点。': 'Lại gần quả dưa hấu lớn thêm một bước.', '再来一局': 'Chơi ván nữa', '继续挑战': 'Tiếp tục thử thách',
    '关闭玩法说明': 'Đóng hướng dẫn', '关闭慢镜头': 'Đóng quay chậm', '把一瞬间，放慢一点': 'Làm chậm một khoảnh khắc', '同一套水果运动，放慢看压缩与回弹。': 'Xem cùng chuyển động ở tốc độ chậm để thấy độ nén và bật lại.', '选择动作场景': 'Chọn cảnh chuyển động', '单果落地': 'Một trái rơi', '大小碰撞': 'Va chạm lớn/nhỏ', '同果合成': 'Ghép trái cùng loại', '水果慢镜头。可开启显示真实节点。': 'Chuyển động chậm của trái cây. Có thể bật hiển thị các nút vật lý.', '拖动时间轴': 'Kéo dòng thời gian', '慢镜头时间轴，单位秒': 'Dòng thời gian quay chậm, đơn vị giây', '慢镜头播放控制': 'Điều khiển phát quay chậm', '播放速度': 'Tốc độ phát', '正常速度': 'Tốc độ bình thường', '四分之一速度': 'Tốc độ 1/4', '前进 1/60 秒模拟时间': 'Tiến 1/60 giây mô phỏng', '+1 帧': '+1 khung', '重来': 'Chạy lại',
    '左右移动，给第一颗水果选个落点。': 'Di chuyển trái/phải để chọn điểm rơi cho trái đầu tiên.',
    '再放一颗也可以，相同水果碰到一起就会合成。': 'Thả thêm một trái; các trái giống nhau sẽ ghép khi chạm nhau.',
    '合成了！接着，亲手试一次揉软。': 'Ghép thành công! Tiếp theo hãy thử làm mềm.', '先看下一颗，再给它留个位置。': 'Xem trái tiếp theo rồi chừa chỗ cho nó.',
    '合成了！继续放，卡住时试试揉软。': 'Ghép thành công! Tiếp tục thả; khi bị kẹt hãy thử Làm mềm.',
    '软乎乎的…': 'Đang làm mềm…', '再攒一点能量': 'Cần thêm năng lượng', '水果图片未能载入，请重新打开文件。': 'Không tải được hình trái cây. Hãy mở lại trang.', '松手放下 · 拖出果池可取消': 'Thả tay để rơi · kéo ra ngoài khay để hủy', '已移出果池，松手会取消': 'Đã ra ngoài khay · thả tay để hủy', '左右移动 · 松手放下第一颗': 'Di chuyển trái/phải · thả trái đầu tiên', '左右移动 · 松手投放': 'Di chuyển trái/phải · thả để rơi', '这颗大西瓜，属于你': 'Quả dưa hấu lớn này là của bạn', '达到自己的最高纪录': 'Kỷ lục cá nhân mới', '合出来了！': 'Ghép được rồi!', '果池装满啦。': 'Khay trái cây đã đầy.', '还可以继续冲分。西瓜会留在果池里，不会消除。': 'Bạn vẫn có thể tiếp tục ghi điểm. Dưa hấu sẽ ở lại trong khay và không biến mất.',
    '蓝莓': 'Việt quất', '葡萄': 'Nho', '樱桃': 'Anh đào', '橙子': 'Cam', '柠檬': 'Chanh', '苹果': 'Táo', '猕猴桃': 'Kiwi', '蜜桃': 'Đào', '椰子': 'Dừa', '哈密瓜': 'Dưa lưới', '西瓜': 'Dưa hấu',
    '西瓜，西瓜不会消除': 'Dưa hấu. Dưa hấu sẽ không biến mất.', '西瓜不会消除，要给新水果留出空间。': 'Dưa hấu không biến mất, hãy chừa chỗ cho trái mới.', '水果投放区。拖动瞄准，松手投放。左右方向键瞄准，回车投放，空格揉软，A D 倾斜，P 暂停。': 'Khu vực thả trái cây. Kéo để ngắm, thả tay để rơi. Phím mũi tên để ngắm, Enter để thả, Space để làm mềm, A/D để nghiêng, P để tạm dừng.'
  };

  window.MeltMelonLocales = Object.freeze({
    'zh-CN': Object.freeze({ name: '中文', strings: Object.freeze({}) }),
    en: Object.freeze({ name: 'English', strings: Object.freeze(en) }),
    vi: Object.freeze({ name: 'Tiếng Việt', strings: Object.freeze(vi) })
  });
})();
