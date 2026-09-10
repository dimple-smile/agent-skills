import { clock, effect, frameLoop, init, surface } from "vgpu";
import sphereShader from "./shaders/sphere.wgsl";
import {
  SphereState,
  type SphereStateOptions,
  toScenePoint,
} from "./sphere-state";

export interface SphereRendererOptions extends SphereStateOptions {
  clickToReact?: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
  onExpressionChange?: (expression: 0 | 1) => void;
}

export interface SphereRenderer {
  readonly canvas: HTMLCanvasElement;
  getExpression(): 0 | 1;
  setExpression(expression: 0 | 1): void;
  toggleExpression(): void;
  dispose(): void;
}

export function startSphere(
  canvas: HTMLCanvasElement,
  options: SphereRendererOptions = {},
): SphereRenderer {
  const clickToReact = options.clickToReact === true;
  let disposed = false;
  let gpu: Awaited<ReturnType<typeof init>> | undefined;
  let loop: ReturnType<typeof frameLoop> | undefined;
  let removeListeners: (() => void) | undefined;
  let stateRef: SphereState | undefined;
  let shownExpression: 0 | 1 = options.expression === 1 ? 1 : 0;

  const api: SphereRenderer = {
    canvas,
    getExpression() {
      return stateRef?.getExpression() ?? shownExpression;
    },
    setExpression(expression) {
      const now = performance.now();
      if (stateRef) {
        stateRef.setExpression(expression, now);
      } else {
        shownExpression = expression;
      }
    },
    toggleExpression() {
      api.setExpression(api.getExpression() === 0 ? 1 : 0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      removeListeners?.();
      loop?.stop();
      gpu?.dispose();
      gpu = undefined;
      stateRef = undefined;
    },
  };

  void (async () => {
    try {
      const context = await init();
      gpu = context;

      if (disposed) {
        context.dispose();
        return;
      }

      const canvasSurface = surface(context, canvas, { dpr: [1, 2] });
      const startedAt = performance.now();
      const state = new SphereState(startedAt, Math.random, {
        idleSwitch: options.idleSwitch,
        idleSwitchMs: options.idleSwitchMs,
        expression: shownExpression,
      });
      stateRef = state;
      const animationClock = clock(context);
      let lastFrameAt = startedAt;

      const sphere = effect(context, sphereShader, {
        label: "msg-sphere",
        set: {
          params: {
            resolution: [canvasSurface.size[0], canvasSurface.size[1]],
            pointer: [0, 0],
            time: 0,
            expressionMix: shownExpression,
            blink: 0,
            yaw: 0,
            pitch: 0,
            padding: 0,
          },
        },
      });

      const pointFromEvent = (event: MouseEvent) => {
        const bounds = canvas.getBoundingClientRect();
        return toScenePoint(
          event.clientX - bounds.left,
          event.clientY - bounds.top,
          bounds.width,
          bounds.height,
        );
      };

      const onPointerMove = (event: PointerEvent): void => {
        state.movePointer(pointFromEvent(event));
      };
      const onPointerLeave = (): void => {
        state.leavePointer();
      };
      const onClick = (event: MouseEvent): void => {
        state.click(pointFromEvent(event), performance.now());
      };

      // window 级跟随:指针悬停在页面内任何元素(词/文案)上时,
      // 脸保持跟随该方向 —— 只有离开整个页面才缓回中。
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("mouseleave", onPointerLeave);
      if (clickToReact) {
        canvas.addEventListener("click", onClick);
      }
      removeListeners = () => {
        window.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("mouseleave", onPointerLeave);
        if (clickToReact) {
          canvas.removeEventListener("click", onClick);
        }
      };

      loop = frameLoop(context, (frame) => {
        const now = performance.now();
        if (document.hidden) {
          lastFrameAt = now;
          return;
        }

        const snapshot = state.frame(now, now - lastFrameAt);
        lastFrameAt = now;

        const nextExpression: 0 | 1 =
          snapshot.expressionMix >= 0.5 ? 1 : 0;
        if (nextExpression !== shownExpression) {
          shownExpression = nextExpression;
          options.onExpressionChange?.(nextExpression);
        }

        sphere.set({
          params: {
            resolution: [canvasSurface.size[0], canvasSurface.size[1]],
            pointer: [snapshot.pointer[0], snapshot.pointer[1]],
            time: animationClock.time,
            expressionMix: snapshot.expressionMix,
            blink: snapshot.blink,
            yaw: snapshot.yaw,
            pitch: snapshot.pitch,
            padding: 0,
          },
        });
        frame.pass(canvasSurface, sphere);
      });

      options.onReady?.();
    } catch (error) {
      gpu?.dispose();
      gpu = undefined;
      if (!disposed) options.onError?.(error);
    }
  })();

  return api;
}
