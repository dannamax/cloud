export interface Server {
  id: number;
  name: string;
  environment: string;
  system_ip: string;
  manage_ip: string;
  oob_ip: string;
  mac_address: string;
  cabinet: string;
  u_position: number;
  u_height: number;
  sn: string;
  brand: string;
  model: string;
  cpu: string;
  memory: string;
  disk: string;
  network_card: string;
  role: string;
  role_type: string;
  tags: string;
  status: '已上架' | '待上架' | '异动中' | '异动回';
  online_status: 'online' | 'offline' | 'unknown';
  last_heartbeat: string;
  remark: string;
  created_at: string;
  updated_at: string;
}

export interface ServerStats {
  total: number;
  online: number;
  offline: number;
  inTransit: number;
  byEnvironment: { environment: string; count: number }[];
  byRole: { role: string; count: number }[];
  byCabinet: { cabinet: string; count: number }[];
  byRoleAndModel: { role: string; role_type: string; model_name: string; count: number }[];
  byRoleType: { role_type: string; role: string; count: number }[];
  roleTypes: RoleType[];
  allServers: any[];
}

export interface RoleType {
  id: number;
  name: string;
  display_name: string;
  color: string;
  icon: string;
  sort_order: number;
  description: string;
  roles?: { role: string; count: number }[];
}

export interface ChangeLog {
  id: number;
  server_id: number;
  server_name: string;
  change_type: string;
  before_status: string;
  after_status: string;
  operator: string;
  remark: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'operator' | 'developer';
  status: 'active' | 'disabled';
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    display_name: string;
    role: string;
    status?: 'active' | 'disabled';
    created_at?: string;
  };
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface Cabinet {
  id: number;
  name: string;
  environment: string;
  total_u: number;
  reserved_u: string;
  remark: string;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: number;
  name: string;
  code: string;
  description: string;
  sort_order: number;
  status: 'active' | 'disabled';
  customFields?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  target: string;
  target_type: string;
  detail: string;
  ip_address: string;
  created_at: string;
}

export interface AuditLogStats {
  today: number;
  week: number;
  byAction: { action: string; count: number }[];
  byUser: { username: string; count: number }[];
  byTarget: { target_type: string; count: number }[];
}

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}
