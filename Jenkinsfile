pipeline {
    agent {
        label 'docker'
    }

    environment {
        APP_NAME = 'student-attendance'
    }

    stages {
        stage('Build Docker Image') {
            steps {
                script {
                    sh 'docker version'
                    sh 'docker build -t attendance:latest .'
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