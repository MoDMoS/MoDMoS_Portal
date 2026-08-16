import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSION_CODES } from '../rbac/rbac.constants';
import { AdminService } from './admin.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateUserRolesDto,
} from './dto/admin.dto';

@Controller('admin')
@Permissions(PERMISSION_CODES.ADMIN_ACCESS)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('permissions')
  listPermissions() {
    return this.admin.listPermissions();
  }

  @Get('roles')
  listRoles() {
    return this.admin.listRoles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.admin.createRole(dto);
  }

  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.admin.updateRole(id, dto);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.admin.deleteRole(id);
  }

  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/roles')
  updateUserRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.admin.updateUserRoles(id, dto.roleIds);
  }
}
