import { IsString, Matches, ValidateIf } from 'class-validator';

// avatarUrl is intentionally not a field here: it's only ever set server-side via
// POST /users/me/avatar (see UsersService.updateAvatar). Accepting a client-supplied
// avatarUrl on this DTO previously allowed an open-redirect via the URL userinfo trick
// (e.g. "@evil.example/x.png" -> "http://localhost:3001@evil.example/x.png").
export class UpdateUserProfileDto {
  @ValidateIf((dto: UpdateUserProfileDto) => dto.name !== undefined)
  @IsString()
  @Matches(/\S/, { message: 'name must not be empty or whitespace only' })
  name?: string;
}
