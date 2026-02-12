import { createParamDecorator } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

export const GetClientId = createParamDecorator(() => {
  const cls = ClsServiceManager.getClsService();
  return cls.get('clientId') || null;
});
