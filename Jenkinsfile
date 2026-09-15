pipeline {
    agent any

    options {
        timeout(time: 10, unit: 'MINUTES')
    }

    environment {
        APP_NAME = 'student-attendance'
    }

    stages {
        stage('Build Docker Image') {
            steps {
                script {
                    sh '''
                        command -v docker || {
                            echo 'Docker is not installed or is not on PATH for this Jenkins agent.'
                            exit 1
                        }
                        docker version
                        docker build -t attendance:latest .
                    '''
                }
            }
        }

        stage('Run Application Container') {
            steps {
                script {
                    sh '''
                        docker stop attendance-con || true
                        docker rm attendance-con || true
                        docker run -d --name attendance-con -p 3100:3000 attendance:latest
                    '''
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline executed successfully!'
        }
        failure {
            echo 'Pipeline failed. Please check logs.'
        }
    }
}