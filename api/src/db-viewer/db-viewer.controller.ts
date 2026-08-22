import { Controller, Get, Param, Query } from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSION_CODES } from '../rbac/rbac.constants';
import { DbViewerService } from './db-viewer.service';

@Controller('admin/databases')
@Permissions(PERMISSION_CODES.ADMIN_ACCESS)
export class DbViewerController {
  constructor(private readonly dbViewer: DbViewerService) {}

  @Get()
  listDatabases() {
    return this.dbViewer.listDatabases();
  }

  @Get(':id/tables')
  listTables(@Param('id') id: string) {
    return this.dbViewer.listTables(id);
  }

  @Get(':id/tables/:schema/:table')
  getTableRows(
    @Param('id') id: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dbViewer.getTableRows(id, schema, table, page, limit);
  }
}
