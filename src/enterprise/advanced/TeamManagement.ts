/**
 * Aether OS - Team Management
 * Enterprise team collaboration and role management
 */

import { EventBus } from '../../core/EventBus';
import { storage } from '../../storage/PersistentStorage';

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  ownerId: string;
  createdAt: number;
  settings: TeamSettings;
}

export interface TeamSettings {
  requireApproval: boolean;
  defaultRole: TeamRole;
  maxMembers: number;
  allowInvites: boolean;
  visibility: 'public' | 'private';
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  joinedAt: number;
  status: 'active' | 'pending' | 'suspended';
  metadata?: Record<string, any>;
}

export type TeamRole = 'owner' | 'admin' | 'member' | 'guest';

export interface Invite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  token: string;
  invitedBy: string;
  invitedAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    { action: '*', resource: '*' },
    { action: 'manage', resource: 'team' },
    { action: 'delete', resource: 'team' },
    { action: 'transfer', resource: 'ownership' }
  ],
  admin: [
    { action: 'manage', resource: 'members' },
    { action: 'invite', resource: 'members' },
    { action: 'remove', resource: 'members' },
    { action: 'manage', resource: 'settings' },
    { action: 'manage', resource: 'workspace' },
    { action: 'delete', resource: 'workspace' }
  ],
  member: [
    { action: 'view', resource: 'workspace' },
    { action: 'create', resource: 'node' },
    { action: 'edit', resource: 'own-node' },
    { action: 'delete', resource: 'own-node' },
    { action: 'invite', resource: 'guests' }
  ],
  guest: [
    { action: 'view', resource: 'shared-workspace' },
    { action: 'comment', resource: 'shared-node' }
  ]
};

export class TeamManager {
  private eventBus: EventBus;
  private currentUserId: string = 'current-user';
  private teams: Map<string, Team> = new Map();
  private members: Map<string, TeamMember[]> = new Map();
  private invites: Map<string, Invite[]> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.loadTeams();
  }

  private async loadTeams(): Promise<void> {
    try {
      const storedTeams = await storage.getAll<Team>('teams');
      storedTeams.forEach(team => this.teams.set(team.id, team));

      const storedMembers = await storage.getAll<TeamMember>('team_members');
      storedMembers.forEach(member => {
        const members = this.members.get(member.teamId) || [];
        members.push(member);
        this.members.set(member.teamId, members);
      });

      const storedInvites = await storage.getAll<Invite>('team_invites');
      storedInvites.forEach(invite => {
        const invites = this.invites.get(invite.teamId) || [];
        invites.push(invite);
        this.invites.set(invite.teamId, invites);
      });

      console.log(`👥 Loaded ${this.teams.size} teams`);
    } catch (e) {
      console.error('Failed to load teams:', e);
    }
  }

  async createTeam(data: {
    name: string;
    description?: string;
    avatar?: string;
    settings?: Partial<TeamSettings>;
  }): Promise<Team> {
    const team: Team = {
      id: `team-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      avatar: data.avatar,
      ownerId: this.currentUserId,
      createdAt: Date.now(),
      settings: {
        requireApproval: data.settings?.requireApproval ?? false,
        defaultRole: data.settings?.defaultRole ?? 'member',
        maxMembers: data.settings?.maxMembers ?? 50,
        allowInvites: data.settings?.allowInvites ?? true,
        visibility: data.settings?.visibility ?? 'private'
      }
    };

    this.teams.set(team.id, team);
    await storage.put('teams', team);

    // Add owner as member
    await this.addMember(team.id, {
      userId: this.currentUserId,
      name: 'You',
      email: 'you@example.com',
      role: 'owner'
    });

    this.eventBus.emit('team:created', team);
    console.log(`👥 Created team: ${team.name}`);

    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    const team = this.teams.get(teamId);
    if (!team) return null;

    // Check permission
    if (!this.canManage(teamId, 'team')) return null;

    const updated: Team = { ...team, ...updates, id: team.id, ownerId: team.ownerId };
    this.teams.set(teamId, updated);
    await storage.put('teams', updated);

    this.eventBus.emit('team:updated', updated);
    return updated;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    if (!this.canManage(teamId, 'team')) return false;

    this.teams.delete(teamId);
    this.members.delete(teamId);
    this.invites.delete(teamId);

    await storage.delete('teams', teamId);

    this.eventBus.emit('team:deleted', teamId);
    console.log(`👥 Deleted team: ${team.name}`);

    return true;
  }

  async addMember(teamId: string, data: {
    userId: string;
    name: string;
    email: string;
    avatar?: string;
    role?: TeamRole;
  }): Promise<TeamMember> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    const members = this.members.get(teamId) || [];
    
    // Check if already member
    if (members.some(m => m.userId === data.userId)) {
      throw new Error('User is already a member');
    }

    // Check max members
    if (members.length >= team.settings.maxMembers) {
      throw new Error('Team has reached maximum members');
    }

    const member: TeamMember = {
      id: `member-${Date.now()}`,
      teamId,
      userId: data.userId,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: data.role || team.settings.defaultRole,
      joinedAt: Date.now(),
      status: 'active'
    };

    members.push(member);
    this.members.set(teamId, members);
    await storage.put('team_members', member);

    this.eventBus.emit('team:member-added', { teamId, member });
    console.log(`👥 Added ${data.name} to team ${team.name}`);

    return member;
  }

  async removeMember(teamId: string, memberId: string): Promise<boolean> {
    const member = this.getMember(teamId, memberId);
    if (!member) return false;

    if (member.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    if (!this.canManage(teamId, 'members')) return false;

    const members = this.members.get(teamId) || [];
    const filtered = members.filter(m => m.id !== memberId);
    this.members.set(teamId, filtered);
    await storage.delete('team_members', member.id);

    this.eventBus.emit('team:member-removed', { teamId, memberId });
    return true;
  }

  async updateMemberRole(teamId: string, memberId: string, newRole: TeamRole): Promise<boolean> {
    const member = this.getMember(teamId, memberId);
    if (!member) return false;

    if (member.role === 'owner') return false;
    if (newRole === 'owner') return false;

    if (!this.canManage(teamId, 'members')) return false;

    member.role = newRole;
    await storage.put('team_members', member);

    this.eventBus.emit('team:member-role-changed', { teamId, memberId, newRole });
    return true;
  }

  async inviteMember(teamId: string, email: string, role?: TeamRole): Promise<Invite> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    if (!team.settings.allowInvites && !this.canManage(teamId, 'members')) {
      throw new Error('Invites are disabled');
    }

    const invite: Invite = {
      id: `invite-${Date.now()}`,
      teamId,
      email,
      role: role || team.settings.defaultRole,
      token: this.generateInviteToken(),
      invitedBy: this.currentUserId,
      invitedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      status: 'pending'
    };

    const invites = this.invites.get(teamId) || [];
    invites.push(invite);
    this.invites.set(teamId, invites);
    await storage.put('team_invites', invite);

    // Send invite email (simulated)
    this.sendInviteEmail(invite, team);

    this.eventBus.emit('team:invite-sent', invite);
    console.log(`📧 Invited ${email} to team ${team.name}`);

    return invite;
  }

  async acceptInvite(token: string): Promise<boolean> {
    let foundInvite: Invite | null = null;
    let foundTeam: Team | null = null;

    for (const [teamId, invites] of this.invites.entries()) {
      const invite = invites.find(i => i.token === token);
      if (invite) {
        foundInvite = invite;
        foundTeam = this.teams.get(teamId) || null;
        break;
      }
    }

    if (!foundInvite || !foundTeam) return false;
    if (foundInvite.status !== 'pending') return false;
    if (Date.now() > foundInvite.expiresAt) {
      foundInvite.status = 'expired';
      return false;
    }

    // Add as member
    await this.addMember(foundTeam.id, {
      userId: `user-${foundInvite.email}`,
      name: foundInvite.email.split('@')[0],
      email: foundInvite.email,
      role: foundInvite.role
    });

    foundInvite.status = 'accepted';
    await storage.put('team_invites', foundInvite);

    this.eventBus.emit('team:invite-accepted', foundInvite);
    return true;
  }

  async declineInvite(token: string): Promise<boolean> {
    for (const invites of this.invites.values()) {
      const invite = invites.find(i => i.token === token);
      if (invite) {
        invite.status = 'declined';
        await storage.put('team_invites', invite);
        this.eventBus.emit('team:invite-declined', invite);
        return true;
      }
    }
    return false;
  }

  // Permission checks
  canManage(teamId: string, resource: string): boolean {
    const member = this.getCurrentMember(teamId);
    if (!member) return false;

    const permissions = ROLE_PERMISSIONS[member.role];
    return permissions.some(p => 
      (p.action === '*' || p.action === 'manage') && 
      (p.resource === '*' || p.resource === resource)
    );
  }

  canAccess(teamId: string, resource: string): boolean {
    const member = this.getCurrentMember(teamId);
    if (!member) return false;

    const permissions = ROLE_PERMISSIONS[member.role];
    return permissions.some(p => 
      (p.action === '*' || p.action === 'view' || p.action === 'manage') && 
      (p.resource === '*' || p.resource === resource)
    );
  }

  private getCurrentMember(teamId: string): TeamMember | null {
    const members = this.members.get(teamId) || [];
    return members.find(m => m.userId === this.currentUserId) || null;
  }

  getMember(teamId: string, memberId: string): TeamMember | null {
    const members = this.members.get(teamId) || [];
    return members.find(m => m.id === memberId || m.userId === memberId) || null;
  }

  getTeamMembers(teamId: string): TeamMember[] {
    return this.members.get(teamId) || [];
  }

  getTeamInvites(teamId: string): Invite[] {
    return this.invites.get(teamId) || [];
  }

  getTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  getUserTeams(userId: string = this.currentUserId): Team[] {
    const userTeams: Team[] = [];
    
    for (const [teamId, members] of this.members.entries()) {
      if (members.some(m => m.userId === userId && m.status === 'active')) {
        const team = this.teams.get(teamId);
        if (team) userTeams.push(team);
      }
    }

    return userTeams;
  }

  private generateInviteToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private sendInviteEmail(invite: Invite, team: Team): void {
    // In production, this would call an email API
    console.log(`📧 Email sent to ${invite.email}: Join ${team.name} as ${invite.role}`);
  }

  // Transfer ownership
  async transferOwnership(teamId: string, newOwnerId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    if (team.ownerId !== this.currentUserId) return false;

    const newOwner = this.getMember(teamId, newOwnerId);
    if (!newOwner) return false;

    const currentOwner = this.getCurrentMember(teamId);
    if (!currentOwner) return false;

    // Swap roles
    currentOwner.role = 'admin';
    newOwner.role = 'owner';
    team.ownerId = newOwner.userId;

    await storage.put('team_members', currentOwner);
    await storage.put('team_members', newOwner);
    await storage.put('teams', team);

    this.eventBus.emit('team:ownership-transferred', { teamId, newOwnerId });
    return true;
  }
}

// Activity tracking
export interface TeamActivity {
  id: string;
  teamId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class TeamActivityTracker {
  private eventBus: EventBus;
  private activities: Map<string, TeamActivity[]> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.eventBus.on('team:member-added', (data) => {
      this.log(data.teamId, 'Added member', 'member', data.member.id);
    });

    this.eventBus.on('team:member-removed', (data) => {
      this.log(data.teamId, 'Removed member', 'member', data.memberId);
    });

    this.eventBus.on('team:invite-sent', (data) => {
      this.log(data.teamId, 'Sent invite', 'invite', data.invite.id);
    });

    this.eventBus.on('team:ownership-transferred', (data) => {
      this.log(data.teamId, 'Transferred ownership', 'team', data.teamId);
    });
  }

  log(teamId: string, action: string, resource: string, resourceId?: string): void {
    const activity: TeamActivity = {
      id: `activity-${Date.now()}`,
      teamId,
      userId: 'current-user',
      action,
      resource,
      resourceId,
      timestamp: Date.now()
    };

    const activities = this.activities.get(teamId) || [];
    activities.unshift(activity);
    
    // Keep last 100 activities
    if (activities.length > 100) {
      activities.pop();
    }
    
    this.activities.set(teamId, activities);
    this.eventBus.emit('team:activity', activity);
  }

  getActivities(teamId: string, limit: number = 50): TeamActivity[] {
    const activities = this.activities.get(teamId) || [];
    return activities.slice(0, limit);
  }
}
