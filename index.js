
import { imageToUrl } from 'd-image'
var isSupportTouch = "ontouchend" in document ? true : false
var _has = Object.prototype.hasOwnProperty

function newEl(tagName, className, cssText) {
    var el = document.createElement(tagName) 
    if (className) el.className = className
    if (cssText) el.style.cssText = cssText
    return el
}

function getPointX(e) {
    return e.clientX || (e.targetTouches && e.targetTouches[0] && e.targetTouches[0].pageX)
} 

function getPointY(e) {
    return e.clientY || (e.targetTouches && e.targetTouches[0] && e.targetTouches[0].pageY)
}


/**
 * @param {HTMLElement} $el 容器元素
 * @param {Object} options 配置选项
 * 支持的配置项目：
 * ratio: 'free' | '长:宽'，如， '4:3'
 * cropDidRender: function, crop每次调整尺寸、移动位置重新绘制后的回调。
 */
function DAvatar(el, options) {

    options = this.options = Object.assign({
        fileSelectText: '选择图片',
        previewText: '请先添加图片',
        buttonText: '确定',
        cropWidth: 400,
        cropHeight: 400,
        previewSize: 260,
        inputQuality: 1, // inputQuality(w,h) || number
        outputType: 'image/jpeg',
        outputQuality: 0.92
    }, options || {})


    // 事件回调函数，绑定this
    this.onCropStart = this.onCropStart.bind(this)
    this.onCropResize = this.onCropResize.bind(this)
    this.onCropMove = this.onCropMove.bind(this)
    this.onCropEnd = this.onCropEnd.bind(this)

    // 创建DOM
    this.$el = el
    this.initDom()

    // 绑定DOM事件
    this.listenCropStart()

    // 初始化preview坐标及尺寸
    this.preview = {
        x: 0,
        y: 0,
        w: this.options.previewSize,
        h: this.options.previewSize
    }
    
    // 初始化裁剪框
    if (options.initCrop) {
        this.crop = options.initCrop
    } else {
        this.crop = {}
    }
}


DAvatar.prototype.cropWhenLoad = function() {
    if (typeof this.crop.x === 'number' &&
        typeof this.crop.y === 'number' &&
        typeof this.crop.w === 'number' &&
        typeof this.crop.h === 'number') {
        this.ensureCropDom()
        this.renderCropEl()
        this.renderCanvas(this.outputCanvasEl, this.options.cropDidComplete)
    }
}


// 初始化DOM
DAvatar.prototype.initDom = function() {
    // 预览画布
    this.previewCanvasEl = newEl('canvas', null, 'box-sizing:border-box;display:block;position:absolute;z-index:0;left:0;top:0;width:100%;height:100%;')

    // 裁剪画布，用于最终输出
    this.outputCanvasEl = newEl('canvas')
    this.outputCanvasEl.width = this.options.cropWidth
    this.outputCanvasEl.height = this.options.cropHeight

    // 预览框默认文字
    this.previewText = newEl( 'span', null, 'position:absolute;z-index:0;left:0;top:0;width:100%;height:100%;font-size:12px;' )
    this.previewText.innerHTML = this.options.previewText

    // 预览图
    this.previewImg = newEl('img', 'preview-img', 'position:absolute;z-index:1;left:0;top:0;max-width:100%;max-height:100%;')

    // 预览区域兜底透明遮罩，防止预览图和文字被鼠标点击到，简化坐标计算
    this.previewArea = newEl('div', 'preview-area', 'position:absolute;z-index:2;left:0;top:0;right:0;bottom:0;width:100%;height:100%;')

    // 预览框，代理点击、触摸、拖动等等所有交互事件
    this.previewEl = newEl('div', 'preview', 'display:inline-block;overflow:hidden;position:relative;width:100%;height:100%;vertical-align:middle;color:#aaa' )

    // 预览框外框容器，定义尺寸之类信息
    this.previewWrapEl = newEl('div', 'preview-wrap', 'overflow:hidden;position:relative;font-size:0;text-align:center;')
    this.previewWrapEl.style.width = this.options.previewSize + 'px';
    this.previewWrapEl.style.height = this.options.previewSize + 'px';
    this.previewWrapEl.style.lineHeight = this.options.previewSize + 'px';

    this.previewEl.appendChild(this.previewText)
    this.previewEl.appendChild(this.previewImg)
    this.previewEl.appendChild(this.previewArea)
    this.previewWrapEl.appendChild(this.previewEl)
    this.$el.appendChild(this.previewWrapEl)
}

// 首次拉框，要创建Dom
DAvatar.prototype.ensureCropDom = function() {
    if (this.cropEl) return
    // 将背景图片弱化处理
    this.previewImg.style.opacity = '.3'
    // 准备裁剪框            
    this.cropEl = newEl('div', 'davatar-crop', 'box-sizing:border-box;position:absolute;z-index:3;min-width:15px;min-height:15px;border:1px dashed rgba(0,0,0,.3);cursor:move')

    // 裁剪框里的resize控制点
    this.resizeCtrlP = newEl('i', 'davatar-crop-cp', 'box-sizing:border-box;display:block;position:absolute;z-index:1;right:-1px;bottom:-1px;width:15px;height:15px;border-left:1px dashed rgba(0,0,0,.3);border-top:1px dashed rgba(0,0,0,.3);background:rgba(0,0,0,.2);cursor:nwse-resize;')

    // 裁剪框里面插入画布以及控制点        
    this.cropEl.appendChild(this.previewCanvasEl)
    this.cropEl.appendChild(this.resizeCtrlP)

    // 将裁剪框插入dom
    this.previewEl.appendChild(this.cropEl)
}

DAvatar.prototype.listenCropStart = function() {
    if (isSupportTouch) {
        this.previewEl.addEventListener('touchstart', this.onCropStart, false)
    } else {
        this.previewEl.addEventListener('mousedown', this.onCropStart, false)
    }
}
DAvatar.prototype.stopListenCropStart = function() {
    if (isSupportTouch) {
        this.previewEl.removeEventListener('touchstart', this.onCropStart)
    } else {
        this.previewEl.removeEventListener('mousedown', this.onCropStart)
    }
}

DAvatar.prototype.listenCropResize = function() {
    if (isSupportTouch) {
        this.previewEl.addEventListener('touchmove', this.onCropResize, false)
    }
    else {
        this.previewEl.addEventListener('mousemove', this.onCropResize, false)
    }
}
DAvatar.prototype.stopListenCropResize = function() {
    if (isSupportTouch) {
        this.previewEl.removeEventListener('touchmove', this.onCropResize)
    } else {
        this.previewEl.removeEventListener('mousemove', this.onCropResize)
    }
}
DAvatar.prototype.listenCropMove = function() {
    if (isSupportTouch) {
        this.previewEl.addEventListener('touchmove', this.onCropMove, false)
    } else {
        this.previewEl.addEventListener('mousemove', this.onCropMove, false)
    }
}
DAvatar.prototype.stopListenCropMove = function() {
    if (isSupportTouch) {
        this.previewEl.removeEventListener('touchmove', this.onCropMove)
    } else {
        this.previewEl.removeEventListener('mousemove', this.onCropMove)
    }
}

DAvatar.prototype.listenCropEnd = function() {
    if (isSupportTouch) {
        this.previewEl.addEventListener('touchend', this.onCropEnd, false);
    } else {
        this.previewEl.addEventListener('mouseup', this.onCropEnd, false);
        this.previewEl.addEventListener('mouseleave', this.onCropEnd, false);
    }
}
DAvatar.prototype.stopListenCropEnd = function() {
    if (isSupportTouch) {
        this.previewEl.removeEventListener('touchend', this.onCropEnd)
    } else {
        this.previewEl.removeEventListener('mouseup', this.onCropEnd)
        this.previewEl.removeEventListener('mouseleave', this.onCropEnd)
    }
}


DAvatar.prototype.onCropStart = function (e) {
    if (!this.imgDidLoad) return
    
    e.preventDefault()

    var i, p, x, y;

    // 具体点击的元素
    var el = e.target

    // 点击的是空白区域（非裁剪区框以及控制点）时，以新原点重新渲染裁剪框
    if (el === this.previewArea) {
        // 首次拉框，先生成Dom
        if (!this.cropEl) this.ensureCropDom()

        // 允许点击之后可以拖动调整裁剪框 
        this.listenCropResize()

        // 裁剪框的初始坐标、尺寸
        // 鼠标相对于previewArea左上角的坐标
        this.crop.x = e.offsetX || e.layerX || (e.targetTouches && e.targetTouches[0] &&
            e.targetTouches[0].pageX - e.target.getBoundingClientRect().left)
        this.crop.y = e.offsetY || e.layerY || (e.targetTouches && e.targetTouches[0] &&
            e.targetTouches[0].pageY - e.target.getBoundingClientRect().top)
        // 确保不小于控制点
        this.crop.w = 15 
        this.crop.h = 15

        // 裁剪框不小于控制点，所以
        // 要限制初始坐标别过于靠近边缘，避免溢出
        if (this.crop.x + 15 > this.preview.w) {
            this.crop.x = this.preview.w - 15
        }
        if (this.crop.y + 15 > this.preview.h) {
            this.crop.y = this.preview.h - 15
        }

        // 标记XY轴哪个方向先触边，便于处理缩放极限
        this.markLimitSide()

        // 将裁剪框的坐标尺寸应用到Dom上
        this.renderCropEl()
    }

    // 点击的是控制点
    if (el === this.resizeCtrlP) {
        // 标记XY轴哪个方向先触边，便于处理缩放极限
        this.markLimitSide()
        this.listenCropResize()
    }

    // 点击的是裁剪框
    if (el === this.cropEl || el === this.previewCanvasEl) {
        this.listenCropMove()
    }

    // 每次onCropStart开始，记录一组原始的坐标
    // 用于后续的onCropResize,onCropMove,onCropEnd等阶段计算偏移量使用
    this.crop._x = this.crop.x
    this.crop._y = this.crop.y
    this.crop._w = this.crop.w
    this.crop._h = this.crop.h
    this.crop._cx = getPointX(e)
    this.crop._cy = getPointY(e)

    this.listenCropEnd()
}


DAvatar.prototype.onCropResize = function (e) {
    e.preventDefault()

    var crop = this.crop

    // 计算鼠标相对于点击时的偏移量
    var dx = getPointX(e) - crop._cx
    var dy = getPointY(e) - crop._cy

    // 根据偏移，计算出当前尺寸
    var w = crop._w + dx
    var h = crop._h + dy

    var ratio = this.getRatio()

    switch (this.limitSide) {
    case 'none':
        if (crop.x + w > this.preview.w - 5) {
            w = this.preview.w - crop.x
        }
        if (crop.y + h > this.preview.h - 5) {
            h = this.preview.h - crop.h
        }
        break

    case 'right':
        // x轴距离右边缘5px时开始吸附并固定，避免溢出，高度使用比率推算
        if (crop.x + w > this.preview.w - 5) {
            w = this.preview.w - crop.x
        }
        h = w / ratio
        break

    case 'bottom':
        // y轴距离边缘5px时开始吸附并固定，避免溢出，宽度使用比率推算
        if (crop.y + h > this.preview.h - 5) {
            h = this.preview.h - crop.h
        }
        w = h * ratio
        break

    case 'both':
        if (crop.x + w > this.preview.w - 5) {
            w = this.preview.w - crop.x
        }
        h = w / ratio
        break
    }

    this.crop.w = w;
    this.crop.h = h;
    this.renderCropEl()
}


DAvatar.prototype.onCropMove = function (e) {
    e.preventDefault()

    var crop = this.crop

    // 计算鼠标相对于点击时的偏移量
    var dx = getPointX(e) - crop._cx
    var dy = getPointY(e) - crop._cy

    // 根据初始原点及移动偏移量，计算新原点坐标
    var ox = crop._x + dx
    var oy = crop._y + dy

    // 避免溢出
    if (ox < 0) ox = 0
    if (oy < 0) oy = 0
    if (ox + crop.w > this.preview.w) {
        ox = this.preview.w - crop.w
    }
    if (oy + crop.h > this.preview.h) {
        oy = this.preview.h - crop.h
    }

    crop.x = ox
    crop.y = oy

    // 渲染新坐标
    this.renderCropEl()
}


DAvatar.prototype.onCropEnd = function (e) {
    var callback = this.options.cropDidComplete;
    e.preventDefault()

    this.stopListenCropResize()
    this.stopListenCropMove()
    this.renderCanvas(this.outputCanvasEl, callback);
}



DAvatar.prototype.renderCropEl = function () {
    var self = this
    var crop = this.crop
    var callback = this.options.cropDidRender
    var cropEl = this.cropEl
    var previewCanvasEl = this.previewCanvasEl
    var render = function () {
        cropEl.style.left = crop.x + 'px'
        cropEl.style.top = crop.y + 'px'
        cropEl.style.width = crop.w + 'px'
        cropEl.style.height = crop.h + 'px'
        previewCanvasEl.width = crop.w
        previewCanvasEl.height = crop.h
        self.renderCanvas(previewCanvasEl, callback)
    }
    if (window.requestAnimationFrame) {
        window.requestAnimationFrame(render)
    } else {
        setTimeout(render, 0)
    }
}


DAvatar.prototype.renderCanvas = function (canvas, callback) {
    if (!this.imgDidLoad) return
    var img = this.previewImg,
        ctx = canvas.getContext('2d'),
        sr = img.naturalWidth / img.width, // scale ratio
        sx = this.crop.x * sr,
        sy = this.crop.y * sr,
        sw = this.crop.w * sr,
        sh = this.crop.h * sr,
        dx = dy = 0,
        dw = canvas.width,
        dh = canvas.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    this.hasDrawImg = true
    callback && callback(canvas, this.crop, this)
}


DAvatar.prototype.output = function(t, q) {
    var type = t || this.rawFile.type || this.options.outputType
    var outputQuality = q || this.options.outputQuality
    return this.outputCanvasEl.toDataURL(type, outputQuality)
}




DAvatar.prototype.getRatio = function () {
    var ratio = this.options.ratio || 'free'
    if (ratio.indexOf(':') !== -1) {
        var r = ratio.split(':').map(function(n){ return n - 0 })
        return r[0] / r[1]
    } else {
        return 'free'
    }
}



// 每次resize crop的时候，标记触边的情况
DAvatar.prototype.markLimitSide = function () {
    this.limitSide = this.detectLimitSide()
}


// 探测当前裁剪框，再resize的时候，哪个方向先触边
DAvatar.prototype.detectLimitSide = function () {
    // 如果限制了缩放比率，则
    // 根据原点坐标，计算剩余伸缩空间的x、y比率，以伸缩比率比较
    var freeSpaceRatio = (this.preview.w - (this.crop.x + this.crop.w)) / (this.preview.h - (this.crop.y + this.crop.h))

    var scaleRatio = this.getRatio()

    if (scaleRatio !== 'free') {
        if (freeSpaceRatio > scaleRatio) {
            // 如果剩余空间x:y比率大于缩放比率，
            // 则说明Y轴方向会早于X轴方向碰触到边缘(下边缘)
            return 'bottom'
        } else if (freeSpaceRatio < scaleRatio) {
            // 剩余空间x:y比率小于缩放比率，
            // 则说明X轴会更早碰触到边缘（右边缘）
            return 'right'
        } else if (freeSpaceRatio === scaleRatio) {
            // 两个比率相等，则两边会同时碰触到边缘
            return 'both'
        }
    } else {
        return 'none'
    }
}


// 接受一个 图片 File
DAvatar.prototype.loadFile = function(rawFile) {
    var self = this
    var previewImgEl = this.previewImg
    var previewTextEl = this.previewText
    if (!(/\.(jpe?g|png|gif)$/i.test(rawFile.name))) return

    this.rawFile = rawFile
    imageToUrl(rawFile, this.options.inputQuality, function(dataUrl) {
        previewImgEl.onload = function() {
            var ratio = previewImgEl.naturalWidth / previewImgEl.naturalHeight
            if (ratio > 1) { // 水平方向较宽
                self.preview.w = self.options.previewSize
                self.preview.h = self.options.previewSize / ratio
                self.previewEl.style.width = self.preview.w + 'px'
                self.previewEl.style.height = self.preview.h + 'px'
                previewImgEl.style.width = self.preview.w + 'px'
                previewImgEl.style.height = self.preview.h + 'px'
            } else { // 竖直方向较高
                self.preview.w = self.options.previewSize * ratio
                self.preview.h = self.options.previewSize
                self.previewEl.style.width = self.preview.w + 'px'
                self.previewEl.style.height = self.preview.h + 'px'
                previewImgEl.style.width = self.preview.w + 'px'
                previewImgEl.style.height = self.preview.h + 'px'
            }
            previewImgEl.style.display = 'block'
            self.imgDidLoad = true
            previewTextEl.style.display = 'none'
            self.cropWhenLoad()
        }
        previewImgEl.src = dataUrl
    })

    // 上一张图片的处理结果清理掉
    if (this.previewCanvasEl) {
        this.previewCanvasEl.getContext('2d').clearRect(0, 0, this.previewCanvasEl.width, this.previewCanvasEl.height)
    }
}



DAvatar.prototype.destroy = function () {
    this.stopListenCropStart()
    this.stopListenCropResize()
    this.stopListenCropMove()
    this.stopListenCropEnd()
    this.cropEl && this.previewEl.removeChild(this.cropEl)
    for (var prop in this) {
        if (_has.call(this, prop)) delete this[prop]
    }
}


export default DAvatar
