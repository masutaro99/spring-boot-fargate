## CDK

スタックは下記 2 つ。ECS 作成前にイメージを push する都合上、ECR リポジトリのみスタックを分離している。

- EcrRepositoryStack
- SpringBootFargateStack

ECR スタックの差分確認

```
npx cdk diff EcrRepositoryStack
```

ECR スタックの差分確認

```
npx cdk deploy EcrRepositoryStack
```

アプリケーションスタックの差分確認

```
npx cdk diff SpringBootFargateStack
```

アプリケーションスタックの差分確認

```
npx cdk deploy SpringBootFargateStack
```

## コンテナイメージ作成

app ディレクトリに移動

```
cd app
```

ビルド

```
./gradlew clean
./gradlew build
```

Docker イメージのビルド

```
IMAGE_TAG=$(git rev-parse --short HEAD)
docker build \
  --platform=linux/x86_64 \
  -t spring-boot-sample-app:${IMAGE_TAG} \
  -f Dockerfile .
```

## ローカル起動

コンテナビルド

```
docker compose build --no-cache app
```

ローカル起動

```
docker compose up -d
```

ローカル起動した PostgreSQL に接続

```
psql -h 127.0.0.1 -p 5432 -U postgres
```
