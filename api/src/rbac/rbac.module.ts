import { Module } from '@nestjs/common';
import { RbacBootstrapService } from './rbac-bootstrap.service';
import { RbacService } from './rbac.service';

@Module({
  providers: [RbacService, RbacBootstrapService],
  exports: [RbacService],
})
export class RbacModule {}
