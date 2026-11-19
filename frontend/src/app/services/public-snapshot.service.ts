import { Injectable } from '@angular/core';
import { Tournament, PublicRegistration } from '../models/models';

/** Non-authoritative, browser-local, public-only display cache. Never used to select a write ID. */
@Injectable({ providedIn: 'root' })
export class PublicSnapshotService {
  private readonly catalogKey = 'caca.publicSnapshot.catalog.v1';
  private playersKey(id: string) { return `caca.publicSnapshot.players.v1.${id}`; }

  catalog(): Tournament[] {
    try {
      const value = JSON.parse(localStorage.getItem(this.catalogKey) || 'null');
      return Array.isArray(value?.items) ? value.items.filter((t: Tournament) => !!t.id) : [];
    } catch { return []; }
  }

  saveCatalog(tournaments: Tournament[]): void {
    try {
      // Never cache admin PIN or other private configuration.
      const items = (tournaments || []).filter(t => !!t.id).map(({adminPin, ...safe}) => safe);
      localStorage.setItem(this.catalogKey, JSON.stringify({updatedAt: new Date().toISOString(), items}));
    } catch { /* Cache failure must never block live registration. */ }
  }

  players(id: string): PublicRegistration[] {
    if (!id) return [];
    try {
      const value = JSON.parse(localStorage.getItem(this.playersKey(id)) || 'null');
      return Array.isArray(value?.items) ? value.items : [];
    } catch { return []; }
  }

  savePlayers(id: string, players: PublicRegistration[]): void {
    if (!id) return;
    try {
      // Public fields only. No email, phone, payment status, or internal IDs.
      const items = (players || []).map(p => ({
        playerName: p.playerName || '', partnerName: p.partnerName || '',
        format: p.format || '', lookingForPartner: !!p.lookingForPartner
      }));
      localStorage.setItem(this.playersKey(id), JSON.stringify({updatedAt: new Date().toISOString(), items}));
    } catch { /* Best effort. */ }
  }

  updatedAt(id?: string): string {
    try {
      const value = JSON.parse(localStorage.getItem(id ? this.playersKey(id) : this.catalogKey) || 'null');
      return typeof value?.updatedAt === 'string' ? value.updatedAt : '';
    } catch { return ''; }
  }
}
