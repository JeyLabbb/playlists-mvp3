import { makeScene2D } from '@motion-canvas/2d/lib/scenes';
import { Circle, Line, Node, Rect, Txt } from '@motion-canvas/2d/lib/components';
import { all, createRef, waitFor } from '@motion-canvas/core/lib/utils';
import { easeInOutCubic, easeOutBack, easeOutElastic } from '@motion-canvas/core/lib/tweening';

export default makeScene2D(function* (view) {
  // Create references for our animated elements
  const background = createRef<Rect>();
  const title = createRef<Txt>();
  const grid = createRef<Node>();
  const nodes = createRef<Node>();
  const connections = createRef<Node>();
  const labels = createRef<Node>();

  // Background
  view.add(
    <Rect
      ref={background}
      width={1080}
      height={1920}
      fill="#111111"
      x={0}
      y={0}
    />
  );

  // Title
  view.add(
    <Txt
      ref={title}
      text="TECH LINES"
      fontSize={72}
      fontWeight={700}
      fill="#00E5A8"
      fontFamily="Arial, sans-serif"
      y={-800}
      opacity={0}
    />
  );

  // Grid container
  view.add(
    <Node ref={grid}>
      {/* Grid lines */}
      {Array.from({ length: 10 }, (_, i) => (
        <Line
          key={`h-${i}`}
          points={[
            [-540, -400 + i * 80],
            [540, -400 + i * 80]
          ]}
          stroke="#333333"
          lineWidth={1}
          opacity={0}
        />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <Line
          key={`v-${i}`}
          points={[
            [-420 + i * 60, -400],
            [-420 + i * 60, 400]
          ]}
          stroke="#333333"
          lineWidth={1}
          opacity={0}
        />
      ))}
    </Node>
  );

  // Nodes container
  view.add(
    <Node ref={nodes}>
      {/* Main nodes */}
      <Circle
        width={60}
        height={60}
        fill="#00E5A8"
        x={-200}
        y={-100}
        opacity={0}
      />
      <Circle
        width={60}
        height={60}
        fill="#00E5A8"
        x={0}
        y={-100}
        opacity={0}
      />
      <Circle
        width={60}
        height={60}
        fill="#00E5A8"
        x={200}
        y={-100}
        opacity={0}
      />
      <Circle
        width={60}
        height={60}
        fill="#00E5A8"
        x={-100}
        y={100}
        opacity={0}
      />
      <Circle
        width={60}
        height={60}
        fill="#00E5A8"
        x={100}
        y={100}
        opacity={0}
      />
      
      {/* Secondary nodes */}
      <Circle
        width={30}
        height={30}
        fill="#00E5A8"
        x={-300}
        y={-200}
        opacity={0}
      />
      <Circle
        width={30}
        height={30}
        fill="#00E5A8"
        x={300}
        y={-200}
        opacity={0}
      />
      <Circle
        width={30}
        height={30}
        fill="#00E5A8"
        x={-200}
        y={200}
        opacity={0}
      />
      <Circle
        width={30}
        height={30}
        fill="#00E5A8"
        x={200}
        y={200}
        opacity={0}
      />
    </Node>
  );

  // Connections container
  view.add(
    <Node ref={connections}>
      {/* Main connections */}
      <Line
        points={[
          [-200, -100],
          [0, -100]
        ]}
        stroke="#00E5A8"
        lineWidth={3}
        opacity={0}
      />
      <Line
        points={[
          [0, -100],
          [200, -100]
        ]}
        stroke="#00E5A8"
        lineWidth={3}
        opacity={0}
      />
      <Line
        points={[
          [-200, -100],
          [-100, 100]
        ]}
        stroke="#00E5A8"
        lineWidth={3}
        opacity={0}
      />
      <Line
        points={[
          [0, -100],
          [100, 100]
        ]}
        stroke="#00E5A8"
        lineWidth={3}
        opacity={0}
      />
      <Line
        points={[
          [200, -100],
          [100, 100]
        ]}
        stroke="#00E5A8"
        lineWidth={3}
        opacity={0}
      />
      <Line
        points={[
          [-100, 100],
          [100, 100]
        ]}
        stroke="#00E5A8"
        lineWidth={3}
        opacity={0}
      />
      
      {/* Secondary connections */}
      <Line
        points={[
          [-300, -200],
          [-200, -100]
        ]}
        stroke="#00E5A8"
        lineWidth={2}
        opacity={0}
      />
      <Line
        points={[
          [300, -200],
          [200, -100]
        ]}
        stroke="#00E5A8"
        lineWidth={2}
        opacity={0}
      />
      <Line
        points={[
          [-100, 100],
          [-200, 200]
        ]}
        stroke="#00E5A8"
        lineWidth={2}
        opacity={0}
      />
      <Line
        points={[
          [100, 100],
          [200, 200]
        ]}
        stroke="#00E5A8"
        lineWidth={2}
        opacity={0}
      />
    </Node>
  );

  // Labels container
  view.add(
    <Node ref={labels}>
      <Txt
        text="AI"
        fontSize={24}
        fontWeight={600}
        fill="#FFFFFF"
        fontFamily="Arial, sans-serif"
        x={-200}
        y={-100}
        opacity={0}
      />
      <Txt
        text="ML"
        fontSize={24}
        fontWeight={600}
        fill="#FFFFFF"
        fontFamily="Arial, sans-serif"
        x={0}
        y={-100}
        opacity={0}
      />
      <Txt
        text="DATA"
        fontSize={24}
        fontWeight={600}
        fill="#FFFFFF"
        fontFamily="Arial, sans-serif"
        x={200}
        y={-100}
        opacity={0}
      />
      <Txt
        text="API"
        fontSize={24}
        fontWeight={600}
        fill="#FFFFFF"
        fontFamily="Arial, sans-serif"
        x={-100}
        y={100}
        opacity={0}
      />
      <Txt
        text="UI"
        fontSize={24}
        fontWeight={600}
        fill="#FFFFFF"
        fontFamily="Arial, sans-serif"
        x={100}
        y={100}
        opacity={0}
      />
    </Node>
  );

  // Animation sequence
  yield* all(
    // Title animation
    title().opacity(1, 1, easeInOutCubic),
    title().y(-700, 1, easeOutBack),
    
    // Wait a bit
    waitFor(0.5),
    
    // Grid animation
    grid().children().forEach((child, i) => {
      child.opacity(0.3, 0.5, easeInOutCubic);
      child.offset([0, 0], 0.5, easeInOutCubic);
    }),
    
    // Wait a bit
    waitFor(0.3),
    
    // Main nodes animation
    nodes().children().slice(0, 5).forEach((child, i) => {
      child.opacity(1, 0.8, easeOutElastic);
      child.scale([0, 0], [1, 1], 0.8, easeOutBack);
    }),
    
    // Wait a bit
    waitFor(0.2),
    
    // Secondary nodes animation
    nodes().children().slice(5).forEach((child, i) => {
      child.opacity(1, 0.6, easeOutElastic);
      child.scale([0, 0], [1, 1], 0.6, easeOutBack);
    }),
    
    // Wait a bit
    waitFor(0.3),
    
    // Connections animation
    connections().children().forEach((child, i) => {
      child.opacity(0.8, 0.5, easeInOutCubic);
    }),
    
    // Wait a bit
    waitFor(0.2),
    
    // Labels animation
    labels().children().forEach((child, i) => {
      child.opacity(1, 0.4, easeInOutCubic);
    }),
    
    // Wait for the end
    waitFor(2)
  );

  // Final pulse effect
  yield* all(
    nodes().children().forEach((child) => {
      child.scale([1, 1], [1.1, 1.1], 0.5, easeOutBack);
      child.scale([1.1, 1.1], [1, 1], 0.5, easeOutBack);
    }),
    
    connections().children().forEach((child) => {
      child.opacity(0.8, 1, 0.5, easeInOutCubic);
      child.opacity(1, 0.8, 0.5, easeInOutCubic);
    })
  );
});
