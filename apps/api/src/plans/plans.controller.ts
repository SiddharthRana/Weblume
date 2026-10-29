import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PLAN_IDS, PLANS } from '@weblume/shared';
import { Public } from '../auth/decorators';
import { PlanDto } from './plans.dto';

@ApiTags('plans')
@Public()
@Controller('plans')
export class PlansController {
  @Get()
  @ApiOkResponse({ type: [PlanDto] })
  list(): PlanDto[] {
    return PLAN_IDS.map((id) => PLANS[id]);
  }
}
