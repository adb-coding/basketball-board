interface IconProps {
  size?: number;
}

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const SelectIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 3l14 8-6 2-2 6z" />
  </svg>
);

export const CutIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20 C9 16 12 12 18 7" />
    <path d="M18 7 l-5 0 M18 7 l0 5" />
  </svg>
);

export const PassIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 19 L18 6" strokeDasharray="3.5 3" />
    <path d="M18 6 l-5 0 M18 6 l0 5" />
  </svg>
);

export const DribbleIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 19 l3-3 2 2 3-3 2 2 3-3" />
    <path d="M19 12 l-4 0 M19 12 l0 4" transform="rotate(-45 17 14)" />
  </svg>
);

export const ScreenIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 19 L15 8" />
    <path d="M11 5 L19 12" />
  </svg>
);

export const ShotIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20 L17 7" />
    <path d="M17 7 l-5 0 M17 7 l0 5" />
    <path d="M13.5 10.5 l-4 0 M13.5 10.5 l0 4" />
  </svg>
);

export const HandoffIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 19 L14 10" />
    <circle cx="17" cy="7" r="3" />
  </svg>
);

export const PenIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 18 C7 10 10 18 13 12 C15 8 18 8 20 6" />
  </svg>
);

export const EraserIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M7 20 L3.5 16.5 a2 2 0 0 1 0-2.8 L13 4 l7 7 -9 9 z" />
    <path d="M9.5 7.5 l7 7" />
  </svg>
);

export const PlayIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M7 4 L19 12 L7 20 Z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M8 5 v14 M16 5 v14" strokeWidth={3} />
  </svg>
);

export const StopIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const LoopIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M17 3 l3 3 -3 3" />
    <path d="M20 6 H8 a5 5 0 0 0 -5 5" />
    <path d="M7 21 l-3-3 3-3" />
    <path d="M4 18 h12 a5 5 0 0 0 5-5" />
  </svg>
);

export const UndoIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M8 5 L3 10 l5 5" />
    <path d="M3 10 h11 a6 6 0 0 1 6 6 v2" />
  </svg>
);

export const RedoIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M16 5 l5 5 -5 5" />
    <path d="M21 10 H10 a6 6 0 0 0 -6 6 v2" />
  </svg>
);

export const ExportIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3 v12 M7 8 l5-5 5 5" />
    <path d="M4 15 v4 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2-2 v-4" />
  </svg>
);

export const BackIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M15 4 L7 12 l8 8" />
  </svg>
);

export const ThemeIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M21 13 A9 9 0 1 1 11 3 a7 7 0 0 0 10 10 z" />
  </svg>
);

export const PlusIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 5 v14 M5 12 h14" />
  </svg>
);

export const TrashIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 7 h16 M9 7 V4 h6 v3 M6 7 l1 13 h10 l1-13" />
  </svg>
);
