import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService - reassignSocialAccountClient', () => {
  const socialAccountFindFirst = jest.fn();
  const clientFindFirst = jest.fn();
  const publicationFindMany = jest.fn();
  const txSocialAccountUpdate = jest.fn();
  const txPublicationUpdateMany = jest.fn();
  const txContentUpdateMany = jest.fn();
  const transaction = jest.fn();

  const prismaMock = {
    socialAccount: {
      findFirst: socialAccountFindFirst,
    },
    client: {
      findFirst: clientFindFirst,
    },
    publication: {
      findMany: publicationFindMany,
    },
    $transaction: transaction,
  };

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(prismaMock as never);

    transaction.mockImplementation(async (callback: any) =>
      callback({
        socialAccount: { update: txSocialAccountUpdate },
        publication: { updateMany: txPublicationUpdateMany },
        content: { updateMany: txContentUpdateMany },
      }),
    );
  });

  it('moves social account and related content successfully', async () => {
    socialAccountFindFirst
      .mockResolvedValueOnce({
        id: 'sa-1',
        userId: 'user-1',
        clientId: 'client-old',
        platform: 'INSTAGRAM',
        platformUserId: 'platform-user-1',
      })
      .mockResolvedValueOnce(null);
    clientFindFirst.mockResolvedValue({ id: 'client-new' });
    publicationFindMany
      .mockResolvedValueOnce([
        { id: 'pub-1', contentId: 'content-1' },
        { id: 'pub-2', contentId: 'content-2' },
      ])
      .mockResolvedValueOnce([]);
    txSocialAccountUpdate.mockResolvedValue({ id: 'sa-1' });
    txPublicationUpdateMany.mockResolvedValue({ count: 1 });
    txContentUpdateMany.mockResolvedValue({ count: 2 });

    const result = await service.reassignSocialAccountClient(
      'user-1',
      'sa-1',
      'client-new',
    );

    expect(result).toEqual({
      socialAccountId: 'sa-1',
      previousClientId: 'client-old',
      targetClientId: 'client-new',
      movedPublications: 2,
      movedContents: 2,
      clearedCampaignRefs: 1,
    });
    expect(txSocialAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'sa-1' },
      data: { clientId: 'client-new' },
      select: { id: true },
    });
  });

  it('throws NotFoundException when social account does not belong to user', async () => {
    socialAccountFindFirst.mockResolvedValue(null);

    await expect(
      service.reassignSocialAccountClient('user-1', 'sa-missing', 'client-new'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when target client is not owned by user', async () => {
    socialAccountFindFirst.mockResolvedValue({
      id: 'sa-1',
      userId: 'user-1',
      clientId: 'client-old',
      platform: 'INSTAGRAM',
      platformUserId: 'platform-user-1',
    });
    clientFindFirst.mockResolvedValue(null);

    await expect(
      service.reassignSocialAccountClient('user-1', 'sa-1', 'client-new'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when duplicate account exists on target client', async () => {
    socialAccountFindFirst
      .mockResolvedValueOnce({
        id: 'sa-1',
        userId: 'user-1',
        clientId: 'client-old',
        platform: 'INSTAGRAM',
        platformUserId: 'platform-user-1',
      })
      .mockResolvedValueOnce({ id: 'duplicate-id' });
    clientFindFirst.mockResolvedValue({ id: 'client-new' });

    await expect(
      service.reassignSocialAccountClient('user-1', 'sa-1', 'client-new'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when content is shared with other social accounts', async () => {
    socialAccountFindFirst
      .mockResolvedValueOnce({
        id: 'sa-1',
        userId: 'user-1',
        clientId: 'client-old',
        platform: 'INSTAGRAM',
        platformUserId: 'platform-user-1',
      })
      .mockResolvedValueOnce(null);
    clientFindFirst.mockResolvedValue({ id: 'client-new' });
    publicationFindMany
      .mockResolvedValueOnce([{ id: 'pub-1', contentId: 'content-1' }])
      .mockResolvedValueOnce([
        {
          id: 'pub-shared',
          contentId: 'content-1',
          socialAccountId: 'sa-2',
          socialAccount: { platform: 'TIKTOK', username: 'shared_user' },
        },
      ]);

    await expect(
      service.reassignSocialAccountClient('user-1', 'sa-1', 'client-new'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propagates transaction errors (rollback handled by database)', async () => {
    socialAccountFindFirst
      .mockResolvedValueOnce({
        id: 'sa-1',
        userId: 'user-1',
        clientId: 'client-old',
        platform: 'INSTAGRAM',
        platformUserId: 'platform-user-1',
      })
      .mockResolvedValueOnce(null);
    clientFindFirst.mockResolvedValue({ id: 'client-new' });
    publicationFindMany.mockResolvedValueOnce([{ id: 'pub-1', contentId: 'content-1' }]);
    publicationFindMany.mockResolvedValueOnce([]);
    txSocialAccountUpdate.mockResolvedValue({ id: 'sa-1' });
    txPublicationUpdateMany.mockResolvedValue({ count: 1 });
    txContentUpdateMany.mockRejectedValue(new Error('content move failed'));

    await expect(
      service.reassignSocialAccountClient('user-1', 'sa-1', 'client-new'),
    ).rejects.toThrow('content move failed');
  });
});
