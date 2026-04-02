import { SlotResponseDto } from './dto/slot-response.dto';
import { SlotsService } from './slots.service';
import {
  ApiDataResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-responses.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

/**
 * Top-level slot lookup — lets clients look up a single slot by its ID
 * without needing to know the doctorId upfront.
 * Useful for booking confirmation pages.
 */
@ApiTags('slots')
@ApiBearerAuth('access-token')
@Controller('slots')
export class SlotsLookupController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single slot by ID (any authenticated user)' })
  @ApiDataResponse(SlotResponseDto, 'Successfully retrieved slot')
  @ApiStandardResponses()
  @ApiNotFoundResponse({
    description: 'Slot not found',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.slotsService.findById(id);
    return { data: result };
  }
}
