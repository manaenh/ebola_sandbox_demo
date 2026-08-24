export type CharacterRole =
  | 'patient'
  | 'nurse'
  | 'doctor'
  | 'cdc'
  | 'paramedic'
  | 'cleaner'
  | 'family'
  | 'public'

type CharacterAvatarProps = {
  role: CharacterRole
  x?: number
  y?: number
  scale?: number
  facing?: 'left' | 'right'
  variant?: number
  unwell?: boolean
}

const palettes: Record<CharacterRole, { top: string; trousers: string; accent: string }> = {
  patient: { top: '#356d82', trousers: '#1b303b', accent: '#ffb45b' },
  nurse: { top: '#4aa9a8', trousers: '#245b63', accent: '#d8ffff' },
  doctor: { top: '#d7e6e7', trousers: '#46636b', accent: '#59e1ec' },
  cdc: { top: '#396f80', trousers: '#203f49', accent: '#59e1ec' },
  paramedic: { top: '#d47a45', trousers: '#273b43', accent: '#fff0d2' },
  cleaner: { top: '#756b9a', trousers: '#303747', accent: '#e0d5ff' },
  family: { top: '#687f69', trousers: '#2f3f3a', accent: '#b9d99e' },
  public: { top: '#526c74', trousers: '#273a41', accent: '#8faab2' },
}

export function CharacterAvatar({
  role,
  x = 0,
  y = 0,
  scale = 1,
  facing = 'right',
  variant = 0,
  unwell = false,
}: CharacterAvatarProps) {
  const palette = palettes[role]
  const skin = ['#c99575', '#ad795e', '#d1a083'][variant % 3]
  const hair = ['#172126', '#2b211d', '#263238'][variant % 3]
  const direction = facing === 'left' ? -1 : 1
  const lean = unwell ? -8 : 0

  return (
    <g
      className={`character-figure role-${role} ${unwell ? 'is-unwell' : ''}`}
      transform={`translate(${x} ${y}) scale(${direction * scale} ${scale}) rotate(${lean})`}
    >
      <ellipse className="character-shadow" cx="0" cy="7" rx="17" ry="7" />
      <path className="character-legs" d="M-7-15 L-9 2 L-3 3 L0-11 L4 3 L10 2 L7-15Z" fill={palette.trousers} />
      <path className="character-torso" d="M-11-42 Q0-47 11-42 L9-15 Q0-10-9-15Z" fill={palette.top} />
      {role === 'nurse' && <path d="M-7-40 L0-31 L7-40 M0-31 V-19" fill="none" stroke="#b9ece9" strokeWidth="2" />}
      {role === 'doctor' && <path d="M-8-40 L0-30 L8-40 M0-30 V-15" fill="none" stroke="#78969d" strokeWidth="1.5" />}
      {role === 'paramedic' && <path d="M-10-30 H10" stroke="#fff0d2" strokeWidth="3" opacity=".8" />}
      {role === 'cleaner' && <path d="M8-34 L18 0" stroke="#9cb9bd" strokeWidth="2" />}
      <path d={unwell ? 'M-8-36 L-17-18' : 'M-9-38 L-17-21'} stroke={skin} strokeWidth="5" strokeLinecap="round" />
      <path d={unwell ? 'M8-37 L1-23' : 'M9-38 L17-21'} stroke={skin} strokeWidth="5" strokeLinecap="round" />
      {unwell && <path d="M-3-28 Q5-21 11-29" fill="none" stroke={palette.accent} strokeWidth="2" opacity=".85" />}
      <circle cx="0" cy="-55" r="9.5" fill={skin} />
      <path d="M-9-58 Q-5-67 7-63 Q11-59 8-51 Q4-60-9-56Z" fill={hair} />
      <path d="M7-55 l5 2 -5 2" fill={skin} />
      {role === 'nurse' && <circle cx="7" cy="-63" r="4.5" fill={hair} />}
      {(role === 'nurse' || role === 'doctor' || role === 'paramedic' || role === 'cdc') && (
        <g className="role-mark" transform="translate(-5 -34)">
          <rect width="10" height="10" rx="2" fill="rgba(7,16,21,.72)" stroke={palette.accent} strokeWidth=".8" />
          {(role === 'nurse' || role === 'doctor' || role === 'paramedic') && <path d="M5 2 V8 M2 5 H8" stroke={palette.accent} strokeWidth="1.5" />}
          {role === 'cdc' && <circle cx="5" cy="5" r="2.5" fill="none" stroke={palette.accent} />}
        </g>
      )}
    </g>
  )
}
