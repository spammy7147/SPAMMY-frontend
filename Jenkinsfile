pipeline {
    agent {
        label 'spammy-builder' // 에이전트에서 빌드 수행
    }

    environment {
        REGISTRY_ACCOUNT = "spammy7147"
        PROJECT_NAME     = "spammy-docker"
        IMAGE_TAG        = "latest"
        CREDENTIAL_ID    = "SPAMMY-github-token"
        REPO_URL         = "https://github.com/spammy7147/SPAMMY-frontend.git"
        DOCKER_CRED_ID   = "docker-hub-repository"
    }

    stages {
        stage('Clone Source Code') {
            steps {
                git credentialsId: "${CREDENTIAL_ID}", url: "${REPO_URL}", branch: 'main'
            }
        }

        stage('Docker Image Build & Push') {
            steps {
                // Dockerfile 내부에서 Node.js 빌드가 완료되므로, 별도의 npm install 단계를 두지 않습니다.
                sh "docker build -t ${REGISTRY_ACCOUNT}/${PROJECT_NAME}:frontend-${IMAGE_TAG} ."

                withCredentials([usernamePassword(credentialsId: "${DOCKER_CRED_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                    sh "docker push ${REGISTRY_ACCOUNT}/${PROJECT_NAME}:frontend-${IMAGE_TAG}"
                }
            }
            post {
                always {
                    sh 'docker image prune -f'
                }
            }
        }

        stage('Deploy to Production') {
            agent {
                label 'built-in' // 마스터 서버로 전환
            }
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: "${DOCKER_CRED_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                        sh "docker pull ${REGISTRY_ACCOUNT}/${PROJECT_NAME}:frontend-${IMAGE_TAG}"
                    }

                    try {
                        sh "docker stop spammy-frontend"
                        sh "docker rm spammy-frontend"
                    } catch (Exception e) {
                        echo "기존에 실행 중인 spammy-frontend 컨테이너가 없습니다. 새로 생성합니다."
                    }

                    // NPM(Nginx Proxy Manager)이 80 포트를 점유하고 있으므로, 8082 포트로 바인딩하여 띄웁니다.
                    sh """
                        docker run -d \
                          --name spammy-frontend \
                          -p 8082:80 \
                          --restart always \
                          ${REGISTRY_ACCOUNT}/${PROJECT_NAME}:frontend-${IMAGE_TAG}
                    """
                }
            }
            post {
                always {
                    sh 'docker image prune -f'
                }
            }
        }
    }

    post {
        success {
            echo 'SPAMMY 프론트엔드가 운영 서버(Port 8082)에 성공적으로 배포되었습니다!'
        }
    }
}
