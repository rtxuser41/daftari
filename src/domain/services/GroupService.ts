import { IGroupRepository } from '../repositories/interfaces';
import { Group } from '../models';

export class GroupService {
  constructor(private groupRepo: IGroupRepository) {}

  async createGroup(userId: string, groupData: Omit<Group, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'studentCount'>): Promise<string> {
    if (!groupData.name || groupData.name.trim() === '') {
      throw new Error('Group name is required.');
    }

    if (groupData.price < 0) {
      throw new Error('Group price cannot be negative.');
    }

    if (groupData.sessionsPerMonth <= 0) {
      throw new Error('Sessions per month must be greater than zero.');
    }

    return this.groupRepo.add({
      ...groupData,
      userId,
      studentCount: 0
    });
  }

  async editGroup(userId: string, groupId: string, updates: Partial<Group>): Promise<void> {
    if (updates.capacity !== undefined && updates.capacity < 0) {
      throw new Error('Group capacity cannot be negative.');
    }

    if (updates.price !== undefined && updates.price < 0) {
      throw new Error('Group price cannot be negative.');
    }
    
    await this.groupRepo.edit(userId, groupId, updates);
  }

  validateCapacity(group: Group, currentStudentCount: number): boolean {
    if (!group.capacity) return true;
    return currentStudentCount < group.capacity;
  }
}
