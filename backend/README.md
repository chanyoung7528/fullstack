# 현재 소스 코드 기반 NestJS/Prisma 동작 원리 설명

## 1. 전체 아키텍처 동작 원리

```
Client Request → Controller → Service → Prisma → Database
```

## 2. 현재 소스 코드 분석

### 2.1 main.ts - 애플리케이션 진입점

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Inflearn API 문서')
    .setDescription('Inflearn API 문서입니다.')
    .setVersion('1.0')
    .addBearerAuth(...)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(8000);
}
```

**역할:**

- NestJS 애플리케이션 생성 및 초기화
- Swagger API 문서 설정
- 8000번 포트에서 서버 실행

### 2.2 AppModule - 루트 모듈

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 전역에서 환경변수 사용 가능
    }),
    PrismaModule, // Prisma 서비스 제공
    AuthModule, // 인증 관련 기능
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Module의 역할:**

- **imports**: 다른 모듈들을 가져와서 사용
- **controllers**: HTTP 요청을 처리하는 컨트롤러들
- **providers**: 서비스, 리포지토리 등 비즈니스 로직 제공자들
- **exports**: 다른 모듈에서 사용할 수 있도록 내보내는 것들

### 2.3 PrismaModule - 데이터베이스 연결 모듈

```typescript
@Global() // 전역 모듈로 설정
@Module({
  providers: [PrismaService], // PrismaService를 제공
  exports: [PrismaService], // 다른 모듈에서 사용할 수 있도록 내보냄
})
export class PrismaModule {}
```

**@Global() 데코레이터:**

- 이 모듈을 전역에서 사용할 수 있게 만듦
- 다른 모듈에서 imports 없이 PrismaService 사용 가능

### 2.4 PrismaService - 데이터베이스 연결 서비스

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect(); // 애플리케이션 시작 시 DB 연결
  }

  async onModuleDestroy() {
    await this.$disconnect(); // 애플리케이션 종료 시 DB 연결 해제
  }
}
```

**동작 원리:**

1. `PrismaClient`를 상속받아 모든 Prisma 기능 사용 가능
2. `OnModuleInit`: NestJS 모듈이 초기화될 때 자동으로 DB 연결
3. `@Injectable()`: 다른 서비스에서 의존성 주입 가능

### 2.5 UserService - 비즈니스 로직 서비스

```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {} // 의존성 주입

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { accounts: true, sessions: true },
    });
  }
}
```

**동작 원리:**

1. **의존성 주입**: `constructor`에서 `PrismaService` 주입받음
2. **타입 안정성**: `Prisma.UserCreateInput`, `User` 타입 사용
3. **관계 데이터**: `include`로 연관된 데이터도 함께 조회

## 3. 실제 동작 흐름

### 3.1 애플리케이션 시작 과정

```
1. main.ts 실행
2. AppModule 로드
3. ConfigModule 초기화 (환경변수 로드)
4. PrismaModule 초기화
5. PrismaService.onModuleInit() 실행 → DB 연결
6. AuthModule 로드
7. 서버 8000번 포트에서 시작
```

### 3.2 API 요청 처리 과정

```
1. Client가 HTTP 요청 전송
2. Controller에서 요청 받음
3. Controller가 Service 메서드 호출
4. Service가 PrismaService 사용하여 DB 작업
5. Prisma가 SQL 쿼리 생성 및 실행
6. DB 결과를 Service → Controller → Client 순으로 반환
```

## 4. 모듈과 컨트롤러의 역할

### 4.1 Module의 역할

- **의존성 관리**: 어떤 서비스들을 사용할지 정의
- **캡슐화**: 관련 기능들을 하나의 모듈로 그룹화
- **재사용성**: 다른 모듈에서 import하여 사용
- **전역 설정**: `@Global()`로 전역 모듈 설정

### 4.2 Controller의 역할 (AppController 예시)

```typescript
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

**Controller의 책임:**

- **HTTP 요청 처리**: `@Get()`, `@Post()` 등으로 라우팅
- **요청 검증**: DTO를 통한 입력 데이터 검증
- **응답 반환**: 클라이언트에게 적절한 형태로 응답
- **비즈니스 로직 위임**: Service에게 실제 작업 위임

## 5. Prisma 연동의 핵심

### 5.1 타입 안정성

```typescript
// Prisma가 자동 생성한 타입들
import { User, Prisma } from '../../generated/prisma';

// 컴파일 타임에 타입 체크
async createUser(data: Prisma.UserCreateInput): Promise<User>
```

### 5.2 자동 쿼리 생성

```typescript
// 이 코드가
this.prisma.user.findUnique({ where: { id } });

// 이런 SQL로 변환됨
// SELECT * FROM users WHERE id = $1
```

### 5.3 관계 데이터 처리

```typescript
// include로 연관 데이터 함께 조회
return this.prisma.user.findUnique({
  where: { id },
  include: {
    accounts: true, // User와 연관된 Account들
    sessions: true, // User와 연관된 Session들
  },
});
```

이렇게 NestJS의 모듈 시스템과 Prisma의 ORM 기능이 결합되어 타입 안전하고 효율적인 백엔드 API를 구축할 수 있습니다.
