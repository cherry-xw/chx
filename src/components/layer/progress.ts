import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

//全局进度条的配置
NProgress.configure({
  showSpinner: false, // 是否显示加载ico
  // easing: 'ease', // 动画方式
  // speed: 800, // 递增进度条的速度
  trickleSpeed: 200, // 自动递增间隔
  minimum: 0.3 // 更改启动时使用的最小百分比
  // parent: 'body', //指定进度条的父容器
})
// 打开进度条
export const start = () => {
  NProgress.start()
}

// 关闭进度条
export const close = () => {
  NProgress.done()
}
