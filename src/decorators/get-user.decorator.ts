import { createParamDecorator } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

export const GetUser = createParamDecorator(() => {
  const cls = ClsServiceManager.getClsService();
  return cls.get('user') || null;
});