export default async function start(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgpu')
  if (!context) {
    throw new Error('WebGPU not supported')
  }
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    throw new Error('WebGPU not supported')
  }
  const device = await adapter.requestDevice()
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
  context.configure({
    device: device,
    format: canvasFormat,
    alphaMode: 'opaque' // alphaMode: 'opaque',
  })
  // 记录 GPU 命令的接口
  const encoder = device.createCommandEncoder()
  // 只是记录供 GPU 稍后执行的命令
  // 定义接收所执行的任何绘制命令的输出的纹理
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        // 之前创建的画布上下文中获取纹理，该方法会返回一个像素宽度和高度与画布的 width 和 height 属性以及调用 context.configure() 时指定的 format 相匹配的纹理
        view: context.getCurrentTexture().createView(),
        // 在渲染通道开始时清除纹理
        loadOp: 'clear',
        // 在渲染通道完成后，将渲染通道期间完成的所有绘制结果保存到纹理
        storeOp: 'store'
        // clearValue: { r: 0, g: 0, b: 0.4, a: 1 } // 清除颜色缓冲区，使用 RGBA 值 (0, 0, 0.4, 1)
      }
    ]
  })
  // 定义顶点数据
  const vertices = new Float32Array([
    // Triangle 1 (Blue)
    -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,
    // Triangle 2 (Red)
    -0.8, -0.8, 0.8, 0.8, -0.8, 0.8
  ])

  // 创建一个缓冲区，用于存储顶点数据
  const vertexBuffer = device.createBuffer({
    label: 'Cell vertices',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  })
  // 将顶点数据写入缓冲区
  device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices)

  // 创建一个着色器模块
  const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: /* wgsl */ `
      @vertex
      fn vertexMain(@location(0) pos: vec2f) ->
        @builtin(position) vec4f {
        return vec4f(pos, 0, 1);
      }
      @fragment
      fn fragmentMain() -> @location(0) vec4f {
        return vec4f(1, 0, 0, 1); // (Red, Green, Blue, Alpha)
      }
    `
  })
  // 创建一个渲染管线
  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [
      {
        format: 'float32x2' as const,
        offset: 0,
        shaderLocation: 0 // Position, see vertex shader
      }
    ]
  }
  const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: 'auto',
    vertex: {
      module: cellShaderModule,
      entryPoint: 'vertexMain',
      buffers: [vertexBufferLayout]
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: canvasFormat
        }
      ]
    }
  })
  pass.setPipeline(cellPipeline)
  pass.setVertexBuffer(0, vertexBuffer)
  pass.draw(vertices.length / 2) // 6 vertices

  pass.end()
  const commandBuffer = encoder.finish() // 将命令提交给 GPU
  device.queue.submit([commandBuffer]) // 提交命令缓冲区以供 GPU 执行
}
