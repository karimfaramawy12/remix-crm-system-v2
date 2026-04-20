export type UserRole = 'super_admin' | 'owner' | 'manager' | 'agent' | 'support' | 'accountant' | 'viewer';

export interface User {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Business {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  contact_email?: string;
  email_provider?: 'mock' | 'resend' | 'smtp';
  email_config?: string;
  plan: string;
  currency?: string;
  modules?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  status: 'active' | 'inactive';
  source?: string;
  assigned_to?: string;
  custom_fields?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  source?: string;
  value: number;
  assigned_to?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: 'active' | 'expiring' | 'expired';
  payment_status: 'paid' | 'unpaid';
  created_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  number: string;
  date: string;
  due_date: string;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string;
  related_type?: 'customer' | 'lead' | 'subscription';
  related_id?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  status: 'planning' | 'construction' | 'completed' | 'sold_out';
  total_units: number;
  available_units: number;
  price_range?: string;
  category?: string;
  unit_type?: string;
  image_url?: string;
  plan_url?: string;
  created_at: string;
}

export interface Quote {
  id: string;
  customer_id: string;
  number: string;
  date: string;
  expiry_date: string;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  customer_name?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  related_type?: string;
  related_id?: string;
  created_at: string;
}
