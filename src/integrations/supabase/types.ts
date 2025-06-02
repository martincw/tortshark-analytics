export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_connections: {
        Row: {
          created_at: string | null
          credentials: Json | null
          customer_id: string | null
          id: string
          is_connected: boolean
          last_synced: string | null
          name: string
          platform: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          customer_id?: string | null
          id?: string
          is_connected?: boolean
          last_synced?: string | null
          name: string
          platform: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          customer_id?: string | null
          id?: string
          is_connected?: boolean
          last_synced?: string | null
          name?: string
          platform?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_tort_coverage: {
        Row: {
          buyer_id: string
          campaign_id: string
          campaign_key: string | null
          campaign_url: string | null
          created_at: string | null
          did: string | null
          id: string
          inbound_did: string | null
          intake_center: string | null
          is_active: boolean
          label: string | null
          notes: string | null
          payout_amount: number
          spec_sheet_url: string | null
          transfer_did: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          buyer_id: string
          campaign_id: string
          campaign_key?: string | null
          campaign_url?: string | null
          created_at?: string | null
          did?: string | null
          id?: string
          inbound_did?: string | null
          intake_center?: string | null
          is_active?: boolean
          label?: string | null
          notes?: string | null
          payout_amount?: number
          spec_sheet_url?: string | null
          transfer_did?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          buyer_id?: string
          campaign_id?: string
          campaign_key?: string | null
          campaign_url?: string | null
          created_at?: string | null
          did?: string | null
          id?: string
          inbound_did?: string | null
          intake_center?: string | null
          is_active?: boolean
          label?: string | null
          notes?: string | null
          payout_amount?: number
          spec_sheet_url?: string | null
          transfer_did?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_tort_coverage_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "case_buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_tort_coverage_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_tort_coverage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ad_mappings: {
        Row: {
          created_at: string | null
          google_account_id: string
          google_campaign_id: string
          google_campaign_name: string
          id: string
          is_active: boolean
          last_synced: string | null
          tortshark_campaign_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_account_id: string
          google_campaign_id: string
          google_campaign_name: string
          id?: string
          is_active?: boolean
          last_synced?: string | null
          tortshark_campaign_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_account_id?: string
          google_campaign_id?: string
          google_campaign_name?: string
          id?: string
          is_active?: boolean
          last_synced?: string | null
          tortshark_campaign_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ad_mappings_tortshark_campaign_id_fkey"
            columns: ["tortshark_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_buyer_stack: {
        Row: {
          buyer_id: string
          campaign_id: string
          created_at: string | null
          id: string
          is_active: boolean
          payout_amount: number
          stack_order: number
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          buyer_id: string
          campaign_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          payout_amount?: number
          stack_order?: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          buyer_id?: string
          campaign_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          payout_amount?: number
          stack_order?: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_buyer_stack_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "case_buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_buyer_stack_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_buyer_stack_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_manual_stats: {
        Row: {
          campaign_id: string
          cases: number
          created_at: string | null
          date: string | null
          id: string
          leads: number
          retainers: number
          revenue: number
          workspace_id: string | null
        }
        Insert: {
          campaign_id: string
          cases?: number
          created_at?: string | null
          date?: string | null
          id?: string
          leads?: number
          retainers?: number
          revenue?: number
          workspace_id?: string | null
        }
        Update: {
          campaign_id?: string
          cases?: number
          created_at?: string | null
          date?: string | null
          id?: string
          leads?: number
          retainers?: number
          revenue?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_manual_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_manual_stats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats: {
        Row: {
          ad_spend: number
          campaign_id: string
          clicks: number
          cpc: number
          created_at: string | null
          date: string | null
          id: string
          impressions: number
        }
        Insert: {
          ad_spend?: number
          campaign_id: string
          clicks?: number
          cpc?: number
          created_at?: string | null
          date?: string | null
          id?: string
          impressions?: number
        }
        Update: {
          ad_spend?: number
          campaign_id?: string
          clicks?: number
          cpc?: number
          created_at?: string | null
          date?: string | null
          id?: string
          impressions?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats_history: {
        Row: {
          ad_spend: number | null
          campaign_id: string
          cases: number
          created_at: string | null
          date: string
          id: string
          leads: number
          retainers: number
          revenue: number
          workspace_id: string | null
        }
        Insert: {
          ad_spend?: number | null
          campaign_id: string
          cases?: number
          created_at?: string | null
          date: string
          id?: string
          leads?: number
          retainers?: number
          revenue?: number
          workspace_id?: string | null
        }
        Update: {
          ad_spend?: number | null
          campaign_id?: string
          cases?: number
          created_at?: string | null
          date?: string
          id?: string
          leads?: number
          retainers?: number
          revenue?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_stats_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_targets: {
        Row: {
          campaign_id: string
          case_payout_amount: number
          created_at: string | null
          id: string
          monthly_income: number
          monthly_retainers: number
          monthly_spend: number
          target_profit: number
          target_roas: number
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          campaign_id: string
          case_payout_amount?: number
          created_at?: string | null
          id?: string
          monthly_income?: number
          monthly_retainers?: number
          monthly_spend?: number
          target_profit?: number
          target_roas?: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          campaign_id?: string
          case_payout_amount?: number
          created_at?: string | null
          id?: string
          monthly_income?: number
          monthly_retainers?: number
          monthly_spend?: number
          target_profit?: number
          target_roas?: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          account_id: string
          account_name: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          platform: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_id: string
          account_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          platform: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          platform?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      case_attributions: {
        Row: {
          buyer_id: string
          campaign_id: string
          case_count: number
          created_at: string | null
          date: string
          id: string
          price_per_case: number
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          buyer_id: string
          campaign_id: string
          case_count?: number
          created_at?: string | null
          date: string
          id?: string
          price_per_case?: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          buyer_id?: string
          campaign_id?: string
          case_count?: number
          created_at?: string | null
          date?: string
          id?: string
          price_per_case?: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_attributions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "case_buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_attributions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      case_buyers: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payout_terms: string | null
          platform: string | null
          updated_at: string | null
          url: string | null
          url2: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payout_terms?: string | null
          platform?: string | null
          updated_at?: string | null
          url?: string | null
          url2?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payout_terms?: string | null
          platform?: string | null
          updated_at?: string | null
          url?: string | null
          url2?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_buyers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      external_lp_campaigns: {
        Row: {
          created_at: string | null
          id: string
          lp_campaign_id: number
          name: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lp_campaign_id: number
          name: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lp_campaign_id?: number
          name?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      google_ads_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          email: string | null
          expires_at: string
          id: string
          refresh_token: string | null
          scope: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email?: string | null
          expires_at: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hyros_campaigns: {
        Row: {
          created_at: string | null
          hyros_campaign_id: string
          id: string
          name: string
          platform: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          hyros_campaign_id: string
          id?: string
          name: string
          platform?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          hyros_campaign_id?: string
          id?: string
          name?: string
          platform?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hyros_stats_raw: {
        Row: {
          ad_spend: number | null
          clicks: number | null
          created_at: string | null
          date: string
          hyros_campaign_id: string
          id: string
          impressions: number | null
          json_payload: Json | null
          leads: number | null
          revenue: number | null
          sales: number | null
          ts_campaign_id: string | null
        }
        Insert: {
          ad_spend?: number | null
          clicks?: number | null
          created_at?: string | null
          date: string
          hyros_campaign_id: string
          id?: string
          impressions?: number | null
          json_payload?: Json | null
          leads?: number | null
          revenue?: number | null
          sales?: number | null
          ts_campaign_id?: string | null
        }
        Update: {
          ad_spend?: number | null
          clicks?: number | null
          created_at?: string | null
          date?: string
          hyros_campaign_id?: string
          id?: string
          impressions?: number | null
          json_payload?: Json | null
          leads?: number | null
          revenue?: number | null
          sales?: number | null
          ts_campaign_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hyros_stats_raw_ts_campaign_id_fkey"
            columns: ["ts_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      hyros_to_ts_map: {
        Row: {
          active: boolean | null
          hyros_campaign_id: string
          id: string
          linked_at: string | null
          ts_campaign_id: string
          unlinked_at: string | null
        }
        Insert: {
          active?: boolean | null
          hyros_campaign_id: string
          id?: string
          linked_at?: string | null
          ts_campaign_id: string
          unlinked_at?: string | null
        }
        Update: {
          active?: boolean | null
          hyros_campaign_id?: string
          id?: string
          linked_at?: string | null
          ts_campaign_id?: string
          unlinked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hyros_to_ts_map_ts_campaign_id_fkey"
            columns: ["ts_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      hyros_tokens: {
        Row: {
          account_id: string | null
          api_key: string
          created_at: string | null
          id: string
          last_synced: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          api_key: string
          created_at?: string | null
          id?: string
          last_synced?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          api_key?: string
          created_at?: string | null
          id?: string
          last_synced?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lp_leads_raw: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          json_payload: Json | null
          lead_date_ms: number | null
          lp_campaign_id: number
          revenue: number | null
          status: string | null
          ts_campaign_id: string
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id: string
          json_payload?: Json | null
          lead_date_ms?: number | null
          lp_campaign_id: number
          revenue?: number | null
          status?: string | null
          ts_campaign_id: string
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          json_payload?: Json | null
          lead_date_ms?: number | null
          lp_campaign_id?: number
          revenue?: number | null
          status?: string | null
          ts_campaign_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_leads_raw_ts_campaign_id_fkey"
            columns: ["ts_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_to_ts_map: {
        Row: {
          active: boolean | null
          id: string
          linked_at: string | null
          lp_campaign_id: string
          ts_campaign_id: string
          unlinked_at: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          linked_at?: string | null
          lp_campaign_id: string
          ts_campaign_id: string
          unlinked_at?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string
          linked_at?: string | null
          lp_campaign_id?: string
          ts_campaign_id?: string
          unlinked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_to_ts_map_lp_campaign_id_fkey"
            columns: ["lp_campaign_id"]
            isOneToOne: false
            referencedRelation: "external_lp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_to_ts_map_ts_campaign_id_fkey"
            columns: ["ts_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ts_daily_lead_metrics: {
        Row: {
          accepted: number | null
          cost: number | null
          created_at: string | null
          date: string
          duplicated: number | null
          failed: number | null
          id: string
          lead_count: number | null
          revenue: number | null
          ts_campaign_id: string
          updated_at: string | null
        }
        Insert: {
          accepted?: number | null
          cost?: number | null
          created_at?: string | null
          date: string
          duplicated?: number | null
          failed?: number | null
          id?: string
          lead_count?: number | null
          revenue?: number | null
          ts_campaign_id: string
          updated_at?: string | null
        }
        Update: {
          accepted?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string
          duplicated?: number | null
          failed?: number | null
          id?: string
          lead_count?: number | null
          revenue?: number | null
          ts_campaign_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ts_daily_lead_metrics_ts_campaign_id_fkey"
            columns: ["ts_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          email: string | null
          expires_at: string
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email?: string | null
          expires_at: string
          id?: string
          provider: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_google_ads_tokens_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_user_default_workspace: {
        Args: { p_user_id: string }
        Returns: string
      }
      is_workspace_admin: {
        Args: { workspace_id: string; user_id?: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { workspace_id: string; user_id: string }
        Returns: boolean
      }
      is_workspace_member_safe: {
        Args: { workspace_id: string; user_id?: string }
        Returns: boolean
      }
      migrate_campaigns_from_localstorage: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      migrate_data_to_workspaces: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_daily_lead_metrics: {
        Args: {
          p_ts_campaign_id: string
          p_date: string
          p_lead_count: number
          p_accepted: number
          p_duplicated: number
          p_failed: number
          p_cost: number
          p_revenue: number
        }
        Returns: undefined
      }
      upsert_hyros_daily_metrics: {
        Args: {
          p_ts_campaign_id: string
          p_date: string
          p_lead_count: number
          p_cost: number
          p_revenue: number
        }
        Returns: undefined
      }
    }
    Enums: {
      workspace_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const
