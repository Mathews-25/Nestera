import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceService } from './governance.service';
import { StellarService } from '../blockchain/stellar.service';
import { SavingsService } from '../blockchain/savings.service';
import { UserService } from '../user/user.service';

describe('GovernanceService', () => {
  let service: GovernanceService;

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockStellarService = {
    getDelegationForUser: jest.fn(),
  };

  const mockSavingsService = {
    getUserVaultBalance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceService,
        { provide: UserService, useValue: mockUserService },
        { provide: StellarService, useValue: mockStellarService },
        { provide: SavingsService, useValue: mockSavingsService },
      ],
    }).compile();

    service = module.get<GovernanceService>(GovernanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserDelegation', () => {
    it('should return delegate when user has publicKey', async () => {
      mockUserService.findById.mockResolvedValue({ publicKey: 'GABC123' });
      mockStellarService.getDelegationForUser.mockResolvedValue('GXYZ456');

      const result = await service.getUserDelegation('user-1');
      expect(result).toEqual({ delegate: 'GXYZ456' });
    });

    it('should return null delegate when user has no publicKey', async () => {
      mockUserService.findById.mockResolvedValue({ publicKey: null });

      const result = await service.getUserDelegation('user-1');
      expect(result).toEqual({ delegate: null });
    });
  });

  describe('getUserVotingPower', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      process.env = { ...OLD_ENV, NST_GOVERNANCE_CONTRACT_ID: 'CONTRACT123' };
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    it('should return 0 NST when user has no publicKey', async () => {
      mockUserService.findById.mockResolvedValue({ publicKey: null });

      const result = await service.getUserVotingPower('user-1');
      expect(result).toEqual({ votingPower: '0 NST' });
    });

    it('should return formatted voting power when user has publicKey', async () => {
      mockUserService.findById.mockResolvedValue({ publicKey: 'GABC123' });
      mockSavingsService.getUserVaultBalance.mockResolvedValue(50_000_000_000);

      const result = await service.getUserVotingPower('user-1');
      expect(result).toEqual({ votingPower: '5,000 NST' });
    });

    it('should throw when NST_GOVERNANCE_CONTRACT_ID is not set', async () => {
      delete process.env.NST_GOVERNANCE_CONTRACT_ID;
      mockUserService.findById.mockResolvedValue({ publicKey: 'GABC123' });

      await expect(service.getUserVotingPower('user-1')).rejects.toThrow(
        'NST governance token contract ID not configured',
      );
    });
  });
});
