import { useRef, useEffect, useCallback } from 'react'
import Konva from 'konva'
import { Stage, Layer, Image as KonvaImage, Text, Rect, Group, Transformer } from 'react-konva'
import type { Overlay, ImageOverlay, TextOverlay } from './VideoEditorTypes'

interface Props {
  overlays: Overlay[]
  selectedId: number | null
  currentTime: number
  stageWidth: number
  stageHeight: number
  imageEls: Map<number, HTMLImageElement>
  onSelect: (id: number | null) => void
  onUpdateOverlay: (id: number, patch: Partial<Overlay>) => void
}

function isVisible(ov: Overlay, t: number) {
  return t >= ov.showFrom && t < ov.showTo
}

function fontStyle(ov: TextOverlay): string {
  if (ov.bold && ov.italic) return 'bold italic'
  if (ov.bold) return 'bold'
  if (ov.italic) return 'italic'
  return 'normal'
}

interface OverlayNodeProps {
  ov: Overlay
  selected: boolean
  visible: boolean
  stageW: number
  stageH: number
  imgEl?: HTMLImageElement
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onTransformEnd: (x: number, y: number, w: number, rot: number) => void
  transformerRef: React.RefObject<Konva.Transformer | null>
}

function ImageOverlayNode({ ov, selected, visible, stageW, stageH, imgEl, onSelect, onDragEnd, onTransformEnd, transformerRef }: OverlayNodeProps) {
  const nodeRef = useRef<Konva.Image>(null)
  const io = ov as ImageOverlay
  const x = (io.xPct / 100) * stageW
  const y = (io.yPct / 100) * stageH
  const w = (io.wPct / 100) * stageW
  const h = imgEl ? w * (imgEl.naturalHeight / imgEl.naturalWidth) : w * 0.5625

  useEffect(() => {
    if (selected && nodeRef.current && transformerRef.current) {
      transformerRef.current.nodes([nodeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selected, transformerRef])

  return (
    <KonvaImage
      ref={nodeRef}
      image={imgEl}
      x={x}
      y={y}
      width={w}
      height={h}
      rotation={io.rotation}
      opacity={visible ? io.opacity / 100 : 0.2}
      draggable={visible}
      listening={visible}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={e => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={e => {
        const node = e.target
        const scaleX = node.scaleX()
        node.scaleX(1)
        node.scaleY(1)
        onTransformEnd(node.x(), node.y(), node.width() * scaleX, node.rotation())
      }}
    />
  )
}

function TextOverlayNode({ ov, selected, visible, stageW, stageH, onSelect, onDragEnd, onTransformEnd, transformerRef }: OverlayNodeProps) {
  const groupRef = useRef<Konva.Group>(null)
  const textRef = useRef<Konva.Text>(null)
  const to = ov as TextOverlay
  const x = (to.xPct / 100) * stageW
  const y = (to.yPct / 100) * stageH
  const w = (to.wPct / 100) * stageW

  useEffect(() => {
    if (selected && groupRef.current && transformerRef.current) {
      transformerRef.current.nodes([groupRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selected, transformerRef])

  const textW = textRef.current?.width() ?? w
  const textH = textRef.current?.height() ?? 40

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      rotation={to.rotation}
      opacity={visible ? to.opacity / 100 : 0.2}
      draggable={visible}
      listening={visible}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={e => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={e => {
        const node = e.target
        const scaleX = node.scaleX()
        node.scaleX(1)
        node.scaleY(1)
        onTransformEnd(node.x(), node.y(), (textRef.current?.width() ?? w) * scaleX, node.rotation())
      }}
    >
      {to.bgOpacity > 0 && (
        <Rect
          width={textW}
          height={textH}
          fill={to.bgColor}
          opacity={to.bgOpacity / 100}
          cornerRadius={to.borderRadius}
        />
      )}
      <Text
        ref={textRef}
        text={to.text}
        fontSize={to.fontSize}
        fontFamily={to.fontFamily}
        fontStyle={fontStyle(to)}
        textDecoration={to.underline ? 'underline' : ''}
        fill={to.fontColor}
        align={to.align}
        letterSpacing={to.letterSpacing}
        lineHeight={to.lineHeight}
        padding={to.padding}
        width={w}
        stroke={to.strokeWidth > 0 ? to.strokeColor : undefined}
        strokeWidth={to.strokeWidth > 0 ? to.strokeWidth : undefined}
        shadowEnabled={to.shadow}
        shadowColor={to.shadowColor}
        shadowBlur={to.shadowBlur}
        wrap="word"
      />
    </Group>
  )
}

export function OverlayLayer({
  overlays,
  selectedId,
  currentTime,
  stageWidth,
  stageHeight,
  imageEls,
  onSelect,
  onUpdateOverlay,
}: Props) {
  const transformerRef = useRef<Konva.Transformer>(null)

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) onSelect(null)
  }, [onSelect])

  const makeHandlers = useCallback((ov: Overlay) => ({
    onSelect: () => onSelect(ov.id),
    onDragEnd: (x: number, y: number) => {
      onUpdateOverlay(ov.id, {
        xPct: (x / stageWidth) * 100,
        yPct: (y / stageHeight) * 100,
      })
    },
    onTransformEnd: (x: number, y: number, w: number, rot: number) => {
      onUpdateOverlay(ov.id, {
        xPct: (x / stageWidth) * 100,
        yPct: (y / stageHeight) * 100,
        wPct: (w / stageWidth) * 100,
        rotation: rot,
      })
    },
  }), [onUpdateOverlay, stageWidth, stageHeight])

  // Deselect transformer when nothing is selected
  useEffect(() => {
    if (selectedId == null && transformerRef.current) {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId])

  if (stageWidth === 0 || stageHeight === 0) return null

  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      style={{ position: 'absolute', inset: 0, zIndex: 2 }}
      onClick={handleStageClick}
    >
      <Layer>
        {overlays.map(ov => {
          const visible = isVisible(ov, currentTime)
          const handlers = makeHandlers(ov)
          const commonProps = { ov, selected: selectedId === ov.id, visible, stageW: stageWidth, stageH: stageHeight, transformerRef, ...handlers }
          if (ov.type === 'image') {
            return <ImageOverlayNode key={ov.id} imgEl={imageEls.get(ov.id)} {...commonProps} />
          }
          return <TextOverlayNode key={ov.id} {...commonProps} />
        })}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-right', 'middle-left']}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#1d4ed8"
          rotateAnchorOffset={24}
        />
      </Layer>
    </Stage>
  )
}
