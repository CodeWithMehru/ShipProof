interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { class: string; label: string }> = {
  verified: { class: 'badge-healthy', label: 'Verified' },
  healthy: { class: 'badge-healthy', label: 'Healthy' },
  live: { class: 'badge-healthy', label: 'Live' },
  up: { class: 'badge-healthy', label: 'Up' },
  yes: { class: 'badge-healthy', label: 'Yes' },
  flagged: { class: 'badge-warning', label: 'Flagged' },
  review_suggested: { class: 'badge-warning', label: 'Review Suggested' },
  warning: { class: 'badge-warning', label: 'Warning' },
  unclear: { class: 'badge-warning', label: 'Unknown' },
  custom_domain: { class: 'badge-pending', label: 'Custom Domain' },
  down: { class: 'badge-danger', label: 'Down' },
  failed: { class: 'badge-danger', label: 'Failed' },
  no: { class: 'badge-danger', label: 'No' },
  pending: { class: 'badge-pending', label: 'Pending' },
  verifying: { class: 'badge-info', label: 'Verifying' },
  insufficient_data: { class: 'badge-pending', label: 'Insufficient Data' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || { class: 'badge-pending', label: status };

  return (
    <span className={`${config.class} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
        config.class.includes('healthy') ? 'bg-status-healthy animate-pulse-subtle' :
        config.class.includes('warning') ? 'bg-status-warning' :
        config.class.includes('danger') ? 'bg-status-danger' :
        config.class.includes('info') ? 'bg-status-info' :
        'bg-text-dim'
      }`} />
      {config.label}
    </span>
  );
}
