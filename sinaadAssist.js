(function (window) {
    // var clip ;
    // window.onload = function () {
    //     init();
    // }
    var floatBox;
    var adListByOrder = [];
    var adListByOrderMap = {};
    var currentPdps;
    init();
    function init () {
        if (/(\.js|\.css)$/.test(location.href)) {//
            return ;
        }
        var adDoms = document.querySelectorAll('.sinaads') || [];
        for (var i = adDoms.length - 1; i >= 0; i--) {
            var pdps = adDoms[i].getAttribute('data-ad-pdps');
            if (pdps && _sinaadsCacheData[pdps]) {
                if (_sinaadsCacheData[pdps].type === "textlink"
                    || _sinaadsCacheData[pdps].type === "embed") {
                    adDoms[i].onmouseover = getInsMouseOverHandler();
                    adDoms[i].onmouseout = getInsMouseOutHandler();
                }
                adListByOrder.push(pdps);
            }
        }
        loadClipboard();
        addFloatBox();

        document.addEventListener('keydown', function (event) {
            if (event.keyCode === 27) {//esc
                cancleHighlightAd();
            } else if (event.keyCode === 72 && (event.ctrlKey || event.altKey)) {
                highlightAd();
            } else if (event.keyCode === 37) {//left
                var index = adListByOrderMap[currentPdps] - 1 || 0;
                index = index < 0 ? index + adListByOrder.length : index;
                var dom = document.querySelector('[data-ad-pdps=' + adListByOrder[index] + ']');
                changeFocus(dom);
            } else if (event.keyCode === 39) {//right
                var index = adListByOrderMap[currentPdps] + 1 || 0;
                index = index >= adListByOrder.length ? 0 : index;
                var dom = document.querySelector('[data-ad-pdps=' + adListByOrder[index] + ']');
                changeFocus(dom);
            }
        });

        adListByOrder.sort(function (a, b) {
            var aDom = document.querySelector('[data-ad-pdps=' + a + ']');
            var bDom = document.querySelector('[data-ad-pdps=' + b + ']');
            var aoffset = sinaadToolkit.dom.getPosition(aDom);
            var boffset = sinaadToolkit.dom.getPosition(bDom);
            return (aoffset.top - boffset.top) * 1000 + (aoffset.left - boffset.left);//top优先排
        });
        for (var i = adListByOrder.length - 1; i >= 0; i--) {
            adListByOrderMap[adListByOrder[i]] = i;
        };

    }
    /**
     * [loadClipboard 载入剪贴板]
     * @return {[type]} [description]
     */
    function loadClipboard() {
        ZeroClipboard.setDefaults({
            moviePath: 'http://d1.sina.com.cn/litong/zhitou/sinaads/zhitou/ZeroClipboard.swf',
            trustedOrigins: [window.location.protocol + "//" + window.location.host]
        });
        window.clip = new ZeroClipboard();
        clip.setHandCursor(true);
        clip.on("complete", function(client, args) {
            var contentDom = document.createElement('span');
            contentDom.innerHTML = args.text;
            contentDom.classList.add('ad_content');
            art.dialog({
                title : '已复制到剪贴板',
                // lock : true,
                time : 1,
                width : 500,
                content : contentDom
            });
            //再次点击时，如果没有重新setText将不会弹出。下面这行代码处理的就是复制之后鼠标没有移动没有执行getMouseOverHandler中的setText
            clip.setText(args.text);
        });
    }
    /**
     * [addFloatBox 添加浮层并绑定初始事件]
     */
    function addFloatBox() {
        floatBox = document.createElement('div');
        floatBox.classList.add('float_box');
        floatBox.id = 'ad_float_box';
        floatBox.innerHTML = "<div class='ad_form_group'>"
                                + "<span class='ad_detail'></span>"
                                + "<button class='ad_copy'>复制t串</button>"
                            + "</div>"
        document.body.appendChild(floatBox);
        floatBox.childNodes[0].childNodes[0].onclick = getDetailBtnHandler();
        floatBox.onmouseover = getFloatBoxMouseOverHandler();
        floatBox.onmouseout = getFloatBoxMouseOutHandler();
        clip.glue(floatBox.querySelector('.ad_copy'));
    }
    /**
     * [highlightAd 高亮广告]
     * @return {[type]} [description]
     */
    function highlightAd() {
        var adDoms = document.querySelectorAll('.sinaads') || [];
        for (var i = adDoms.length - 1; i >= 0; i--) {
            var aDom = adDoms[i];
            aDom.classList.add('ad_highlight');
        }
        var bgmask = document.getElementById('bgmask');
        bgmask && (bgmask.style.display = '');
    }

    /**
     * [cancleHighlightAd 取消高亮广告]
     */
    function cancleHighlightAd() {
        var adDoms = document.querySelectorAll('.sinaads') || [];
        for (var i = adDoms.length - 1; i >= 0; i--) {
            var aDom = adDoms[i];
            aDom.classList.remove('ad_highlight');
        }
        var bgmask = document.getElementById('bgmask');
        bgmask && (bgmask.style.display = 'none');
    }
    /**
     * [getFloatBoxMouseOverHandler 移入浮层清除定时]
     */
    function getFloatBoxMouseOverHandler () {
        return function (event) {
            timer && clearTimeout(timer);
        };
    }
    function getFloatBoxMouseOutHandler () {
        return function (event) {
            if (this.contains(event.relatedTarget)) {//不是移到其它子节点
                return ;
            }
            if (event.relatedTarget && (event.relatedTarget.src || '').indexOf('ZeroClipboard.swf') !== -1) { //移到那个复制按钮上
                return ;
            }
            floatBox.style.left = '-999px';
            floatBox.style.top = '-999px';
        };
    }
    /**
     * [getInsMouseOverHandler 这个函数有点长---作用是：显示浮层并填充数据，中间一片top left width height 是计算位置的。]
     * @return {[type]} [description]
     */
    function getInsMouseOverHandler () {
        var viewWidth = document.body.offsetWidth;
        return function (event) {
            timer && clearTimeout(timer);
            var pdps = this.getAttribute('data-ad-pdps');
            var data = _sinaadsCacheData[pdps];
            var monitor = _sinaadsCacheData[pdps].content[0].monitor;
            var tStr = "";
            for (var i = monitor.length - 1; i >= 0; i--) {
                if(0 === monitor[i].indexOf('http://sax.sina.com.cn/click?')) {
                    var tIndex = monitor[i].indexOf('t=');
                    tStr = monitor[i].substr(tIndex + 2);
                    break;
                }
            };
            clip.glue(floatBox.querySelector('.ad_copy'));
            clip.setText(tStr);
            var position = sinaadToolkit.dom.getPosition(this);
            var left = position.left;
            var top = position.top;
            var floatBoxLeft = left;
            var floatBoxTop = top - 23;
            floatBoxTop = floatBoxTop < 0 ? 0 : floatBoxTop;
            // var adWidth = this.offsetWidth;
            // var adHeight = this.offsetHeight;
            // var floatWidth = 514;
            // var floatHeight = 264;
            // if (left > floatWidth) {//左侧有足够区域
            //     floatBoxLeft = left - floatWidth;
            //     floatBoxTop = top;
            // } else if (viewWidth - left - adWidth > floatWidth) {//右侧有足够区域
            //     floatBoxLeft = left + adWidth;
            //     floatBoxTop = top;
            // } else if (top - document.body.scrollTop > floatHeight) {//上方有足够区域
            //     floatBoxTop = top - floatHeight;
            //     floatBoxLeft = (viewWidth - floatWidth) / 2;
            // } else {
            //     floatBoxTop = top + adHeight;
            //     floatBoxLeft = (viewWidth - floatWidth) / 2;
            // }
            floatBox.childNodes[0].childNodes[0].innerText = pdps;
            // floatBox.childNodes[1].childNodes[1].innerText = data.content[0].monitor && data.content[0].monitor.join(' ');
            floatBox.style.left = floatBoxLeft + 'px';
            floatBox.style.top = floatBoxTop + 'px';
            // floatBox.style.visibility = 'visible';
            var a = floatBox.offsetHeight;
            // console.log(floatBox.offsetHeight); 
            changeFocus(this);
        };
    }
    var timer;
    function getInsMouseOutHandler () {
        return function (event) {
            if (!this.contains(event.relatedTarget)) {
                timer = setTimeout(function () {
                    floatBox.style.left = '-999px';
                    floatBox.style.top = '-999px';
                }, 500);
            }
        };
    }

    /**
     * [getDetailBtnHandler 智投文字链的内容包含多条，需要在新窗口显示]
     */
    function getDetailBtnHandler () {
        return function (event) {
            var pdps = this.innerText;
            var data = _sinaadsCacheData[pdps];
            if (data.type === 'textlink' && data.content.length > 1) {
                var content = _sinaadsCacheData[pdps].content;
                var monitor;
                var tStr = "";
                var itemHtml = [];
                for (var i = content.length - 1; i >= 0; i--) {//智投文字链content有多个内容
                    monitor = content[i].monitor;
                    for (var j = monitor.length - 1; j >= 0; j--) {
                        if(0 === monitor[j].indexOf('http://sax.sina.com.cn/click?')) {
                            var tIndex = monitor[j].indexOf('t=');
                            tStr = monitor[j].substr(tIndex + 2);
                            break;
                        }
                    };
                    itemHtml.unshift('<div class="ad_form_group">'
                            + '<label>' + content[i].src[0] + '</label><button data-t=' + tStr + ' class="ad_copy">复制t串</button>'
                            + '<textarea>' + monitor.join(' ') + '</textarea>'
                        + '</div>');
                }

                var contentDom = document.createElement('div');
                contentDom.innerHTML = itemHtml.join('');
                art.dialog({
                    title : pdps + '详情',
                    lock : true,
                    width : 500,
                    content : contentDom
                });
                var copyBtns = contentDom.querySelectorAll('.ad_copy');
                clip.glue(copyBtns);
                for (var i = copyBtns.length - 1; i >= 0; i--) {
                    copyBtns[i].onmouseover = function () {
                        clip.setText(this.getAttribute('data-t') || '');
                    }
                }
            } else {
                art.dialog({
                    title : pdps + '详情',
                    // lock : true,
                    width : 500,
                    content : '<div style="height:300px;overflow-y:scroll;">' + format(filter(JSON.stringify(data))) + '</div>'
                });
            }
            
        };
    }
    function format (jsondata) {
        return jsondata.replace(/,/g, ',<br>')
                .replace(/\{/g, '{<div class="nested-json">')
                .replace(/\}/g, '</div>}');
    }
    function filter (str) {
        return str.replace(/</g,'&lt;')
                .replace(/>/g, '&gt;');
    }
    function _getReplaceAdHandler () {
        return function (event) {

        };
    }

    var DURATION = 150;
    var ringElem = null;
    var movingId = 0;
    var prevFocused = null;
    initialize();
    function initialize () {
        ringElem = document.createElement('flying-focus'); // use uniq element name to decrease the chances of a conflict with website styles
        ringElem.id = 'flying-focus';
        ringElem.style.transitionDuration = ringElem.style.WebkitTransitionDuration = DURATION / 1000 + 's';
        document.body.appendChild(ringElem);
    }
    var screenHeight = screen.availHeight;
    function changeFocus(target) {

        currentPdps = target.getAttribute('data-ad-pdps')

        var offset = sinaadToolkit.dom.getPosition(target);
        ringElem.style.left = offset.left + 'px';
        ringElem.style.top = offset.top + 'px';
        ringElem.style.width = target.offsetWidth + 'px';
        ringElem.style.height = target.offsetHeight + 'px';

        onEnd();
        target.classList.add('flying-focus_target');
        ringElem.classList.add('flying-focus_visible');
        prevFocused = target;
        movingId = setTimeout(onEnd, DURATION);
        var top = offset.top - (screenHeight - target.offsetHeight) / 2;
        // var top = offset.top - (target.offsetHeight) / 2;
        scrollTo(offset.left, top);
    }

    function onEnd() {
        if (!movingId) {
            return;
        }
        clearTimeout(movingId);
        movingId = 0;
        // ringElem.classList.remove('flying-focus_visible');
        prevFocused.classList.remove('flying-focus_target');
        prevFocused = null;
    }

    
})(window);