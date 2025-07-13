## CDK

スタックは下記 2 つ。ECS 作成前にイメージを push する都合上、ECR リポジトリのみスタックを分離している。

- EcrRepositoryStack
- SpringBootFargateStack

CloudWatch エージェントの設定ファイルは Systems Manager パラメータストアに格納して利用する想定。  
SpringBootFargateStack 作成前に、`ecs-cwagent` という名前でパラメータストアを作成して、下記設定を格納する。

```
{
  "traces": {
    "traces_collected": {
      "application_signals": {}
    }
  },
  "logs": {
    "metrics_collected": {
      "application_signals": {}
    }
  }
}
```

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

イメージタグは、`bin/spring-boot-fargate.ts` で指定して ECS タスク定義に反映させる。

## DB へのテストデータ挿入

VPC CloudShell を起動することを想定。  
テーブル作成。

```
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

データ挿入。

```
INSERT INTO tasks (content) VALUES ('writing');
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
